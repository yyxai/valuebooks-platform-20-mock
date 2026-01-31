import type { EventBus } from '@valuebooks/shared';
import { Order } from '../domain/Order.js';
import { OrderLineItem } from '../domain/OrderLineItem.js';
import type { Address } from '../domain/Address.js';
import { BookCondition } from '../domain/BookCondition.js';
import { Money } from '../domain/Money.js';
import type { PaymentMethod } from '../domain/Payment.js';
import { ShipmentTracking } from '../domain/ShipmentTracking.js';
import { OrderEventTypes } from '../domain/events/index.js';
import type { OrderRepository } from '../infrastructure/OrderRepository.js';
import type { ListingClient } from '../infrastructure/ListingClient.js';

export interface PaymentInfo {
  method: PaymentMethod;
  transactionId: string;
}

export interface ShippingInfo {
  carrier: string;
  trackingNumber: string;
}

export class OrderService {
  constructor(
    private repository: OrderRepository,
    private listingClient: ListingClient,
    private eventBus: EventBus
  ) {}

  async create(customerId: string, shippingAddress: Address): Promise<Order> {
    const order = Order.create({ customerId, shippingAddress });
    await this.repository.save(order);

    this.eventBus.publish({
      type: OrderEventTypes.CREATED,
      payload: { orderId: order.id, customerId },
      timestamp: new Date(),
    });

    return order;
  }

  async addLineItem(orderId: string, listingId: string): Promise<Order> {
    const order = await this.repository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const listing = await this.listingClient.getById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const lineItem = OrderLineItem.create({
      listingId: listing.id,
      isbn: listing.isbn,
      title: listing.title,
      author: listing.author,
      condition: listing.condition as BookCondition,
      price: new Money(listing.listingPrice),
    });

    const updated = order.addLineItem(lineItem);
    await this.repository.save(updated);

    return updated;
  }

  async removeLineItem(orderId: string, listingId: string): Promise<Order> {
    const order = await this.repository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const updated = order.removeLineItem(listingId);
    await this.repository.save(updated);

    return updated;
  }

  async getById(orderId: string): Promise<Order | null> {
    return this.repository.findById(orderId);
  }

  async getByCustomerId(customerId: string): Promise<Order[]> {
    return this.repository.findByCustomerId(customerId);
  }

  async checkout(orderId: string): Promise<Order> {
    const order = await this.repository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Start checkout
    let updated = order.startCheckout();

    // Hold all listings with rollback on failure
    const heldListingIds: string[] = [];
    try {
      for (const item of updated.lineItems) {
        await this.listingClient.holdForOrder(item.listingId, orderId);
        heldListingIds.push(item.listingId);
      }
    } catch (error) {
      // Rollback: release any listings we managed to hold
      for (const listingId of heldListingIds) {
        try {
          await this.listingClient.releaseHold(listingId);
        } catch {
          // Log but continue releasing others
        }
      }
      throw error;
    }

    // Confirm holdings
    updated = updated.confirmHoldings(heldListingIds);
    await this.repository.save(updated);

    this.eventBus.publish({
      type: OrderEventTypes.CHECKOUT_STARTED,
      payload: { orderId, listingIds: heldListingIds },
      timestamp: new Date(),
    });

    return updated;
  }

  async processPayment(orderId: string, paymentInfo: PaymentInfo): Promise<Order> {
    const order = await this.repository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Process payment
    const updated = order.processPayment({
      method: paymentInfo.method,
      transactionId: paymentInfo.transactionId,
    });

    // Mark all listings as sold
    for (const item of updated.lineItems) {
      await this.listingClient.markSold(item.listingId);
    }

    await this.repository.save(updated);

    this.eventBus.publish({
      type: OrderEventTypes.PAYMENT_PROCESSED,
      payload: {
        orderId,
        amount: updated.total.amount,
        method: paymentInfo.method,
      },
      timestamp: new Date(),
    });

    this.eventBus.publish({
      type: OrderEventTypes.CONFIRMED,
      payload: {
        orderId,
        customerId: updated.customerId,
        lineItems: updated.lineItems.map(item => ({
          listingId: item.listingId,
          isbn: item.isbn,
          title: item.title,
          author: item.author,
          condition: item.condition,
          price: item.price.amount,
        })),
        shippingAddress: updated.shippingAddress.toJSON(),
      },
      timestamp: new Date(),
    });

    return updated;
  }

  async markShipped(orderId: string, shippingInfo: ShippingInfo): Promise<Order> {
    const order = await this.repository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const tracking = ShipmentTracking.create({
      carrier: shippingInfo.carrier,
      trackingNumber: shippingInfo.trackingNumber,
    });

    const updated = order.ship(tracking);
    await this.repository.save(updated);

    this.eventBus.publish({
      type: OrderEventTypes.SHIPPED,
      payload: {
        orderId,
        trackingNumber: shippingInfo.trackingNumber,
        carrier: shippingInfo.carrier,
      },
      timestamp: new Date(),
    });

    return updated;
  }

  async markDelivered(orderId: string): Promise<Order> {
    const order = await this.repository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const updated = order.markDelivered();
    await this.repository.save(updated);

    this.eventBus.publish({
      type: OrderEventTypes.DELIVERED,
      payload: {
        orderId,
        deliveredAt: updated.shipmentTracking!.deliveredAt!,
      },
      timestamp: new Date(),
    });

    return updated;
  }

  async cancel(orderId: string, reason?: string): Promise<Order> {
    const order = await this.repository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Release any held listings before cancelling
    const heldListingIds = order.getHeldListingIds();
    for (const listingId of heldListingIds) {
      try {
        await this.listingClient.releaseHold(listingId);
      } catch {
        // Log but continue
      }
    }

    const updated = order.cancel(reason);
    await this.repository.save(updated);

    this.eventBus.publish({
      type: OrderEventTypes.CANCELLED,
      payload: { orderId, reason },
      timestamp: new Date(),
    });

    return updated;
  }

  async releaseExpiredCheckouts(timeoutMs?: number): Promise<number> {
    const expiredOrders = await this.repository.findExpiredCheckouts(timeoutMs);

    for (const order of expiredOrders) {
      await this.cancel(order.id, 'Checkout timeout');
    }

    return expiredOrders.length;
  }
}
