import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderService } from './OrderService.js';
import { InMemoryOrderRepository } from '../infrastructure/InMemoryOrderRepository.js';
import { InMemoryListingClient, type ListingData } from '../infrastructure/ListingClient.js';
import { Address } from '../domain/Address.js';
import { OrderStatus } from '../domain/OrderStatus.js';
import { LineItemStatus } from '../domain/OrderLineItem.js';
import { PaymentMethod } from '../domain/Payment.js';
import { EventBus } from '@valuebooks/shared';
import { OrderEventTypes } from '../domain/events/index.js';

describe('OrderService', () => {
  let service: OrderService;
  let repository: InMemoryOrderRepository;
  let listingClient: InMemoryListingClient;
  let eventBus: EventBus;
  let shippingAddress: Address;

  const testListing: ListingData = {
    id: 'listing-1',
    isbn: '978-0-13-468599-1',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    condition: 'good',
    listingPrice: 1999,
    status: 'available',
  };

  beforeEach(() => {
    repository = new InMemoryOrderRepository();
    listingClient = new InMemoryListingClient();
    eventBus = new EventBus();
    service = new OrderService(repository, listingClient, eventBus);

    shippingAddress = Address.create({
      name: 'John Doe',
      street1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
    });

    listingClient.addListing(testListing);
  });

  describe('create', () => {
    it('creates a new order', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');

      const order = await service.create('customer-123', shippingAddress);

      expect(order.id).toBeDefined();
      expect(order.customerId).toBe('customer-123');
      expect(order.status).toBe(OrderStatus.Draft);
      expect(order.shippingAddress).toBe(shippingAddress);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OrderEventTypes.CREATED,
          payload: { orderId: order.id, customerId: 'customer-123' },
        })
      );
    });
  });

  describe('addLineItem', () => {
    it('adds a line item from a listing', async () => {
      const order = await service.create('customer-123', shippingAddress);

      const updated = await service.addLineItem(order.id, 'listing-1');

      expect(updated.lineItems).toHaveLength(1);
      expect(updated.lineItems[0].listingId).toBe('listing-1');
      expect(updated.lineItems[0].isbn).toBe('978-0-13-468599-1');
      expect(updated.lineItems[0].title).toBe('Clean Code');
      expect(updated.lineItems[0].price.amount).toBe(1999);
    });

    it('throws when order not found', async () => {
      await expect(service.addLineItem('non-existent', 'listing-1')).rejects.toThrow(
        'Order not found'
      );
    });

    it('throws when listing not found', async () => {
      const order = await service.create('customer-123', shippingAddress);

      await expect(service.addLineItem(order.id, 'non-existent')).rejects.toThrow(
        'Listing not found'
      );
    });
  });

  describe('removeLineItem', () => {
    it('removes a line item from the order', async () => {
      let order = await service.create('customer-123', shippingAddress);
      order = await service.addLineItem(order.id, 'listing-1');

      const updated = await service.removeLineItem(order.id, 'listing-1');

      expect(updated.lineItems).toHaveLength(0);
    });

    it('throws when order not found', async () => {
      await expect(service.removeLineItem('non-existent', 'listing-1')).rejects.toThrow(
        'Order not found'
      );
    });
  });

  describe('checkout', () => {
    it('holds all listings and transitions to PaymentPending', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      let order = await service.create('customer-123', shippingAddress);
      order = await service.addLineItem(order.id, 'listing-1');

      const updated = await service.checkout(order.id);

      expect(updated.status).toBe(OrderStatus.PaymentPending);
      expect(updated.lineItems[0].status).toBe(LineItemStatus.Held);
      expect(listingClient.isHeld('listing-1')).toBe(true);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OrderEventTypes.CHECKOUT_STARTED,
          payload: { orderId: order.id, listingIds: ['listing-1'] },
        })
      );
    });

    it('throws when order not found', async () => {
      await expect(service.checkout('non-existent')).rejects.toThrow('Order not found');
    });

    it('releases previously held listings on failure', async () => {
      const listing2: ListingData = {
        id: 'listing-2',
        isbn: '978-0-13-235088-4',
        title: 'The Clean Coder',
        author: 'Robert C. Martin',
        condition: 'good',
        listingPrice: 2499,
        status: 'available',
      };
      listingClient.addListing(listing2);

      let order = await service.create('customer-123', shippingAddress);
      order = await service.addLineItem(order.id, 'listing-1');
      order = await service.addLineItem(order.id, 'listing-2');

      // Pre-hold listing-2 to cause failure
      await listingClient.holdForOrder('listing-2', 'other-order');

      await expect(service.checkout(order.id)).rejects.toThrow();

      // listing-1 should have been released after rollback
      expect(listingClient.isHeld('listing-1')).toBe(false);
    });
  });

  describe('processPayment', () => {
    it('processes payment and marks listings as sold', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      let order = await service.create('customer-123', shippingAddress);
      order = await service.addLineItem(order.id, 'listing-1');
      order = await service.checkout(order.id);

      const updated = await service.processPayment(order.id, {
        method: PaymentMethod.CreditCard,
        transactionId: 'txn-123',
      });

      expect(updated.status).toBe(OrderStatus.Confirmed);
      expect(updated.payment).toBeDefined();
      expect(updated.payment!.transactionId).toBe('txn-123');
      expect(updated.lineItems[0].status).toBe(LineItemStatus.Sold);
      expect(listingClient.isSold('listing-1')).toBe(true);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OrderEventTypes.PAYMENT_PROCESSED,
        })
      );

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OrderEventTypes.CONFIRMED,
        })
      );
    });

    it('throws when order not found', async () => {
      await expect(
        service.processPayment('non-existent', {
          method: PaymentMethod.CreditCard,
          transactionId: 'txn-123',
        })
      ).rejects.toThrow('Order not found');
    });
  });

  describe('markShipped', () => {
    it('marks order as shipped with tracking', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      let order = await service.create('customer-123', shippingAddress);
      order = await service.addLineItem(order.id, 'listing-1');
      order = await service.checkout(order.id);
      order = await service.processPayment(order.id, {
        method: PaymentMethod.CreditCard,
        transactionId: 'txn-123',
      });

      const updated = await service.markShipped(order.id, {
        carrier: 'USPS',
        trackingNumber: '1234567890',
      });

      expect(updated.status).toBe(OrderStatus.Shipped);
      expect(updated.shipmentTracking).toBeDefined();
      expect(updated.shipmentTracking!.carrier).toBe('USPS');
      expect(updated.shipmentTracking!.trackingNumber).toBe('1234567890');

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OrderEventTypes.SHIPPED,
          payload: expect.objectContaining({
            orderId: order.id,
            carrier: 'USPS',
            trackingNumber: '1234567890',
          }),
        })
      );
    });
  });

  describe('markDelivered', () => {
    it('marks order as delivered', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      let order = await service.create('customer-123', shippingAddress);
      order = await service.addLineItem(order.id, 'listing-1');
      order = await service.checkout(order.id);
      order = await service.processPayment(order.id, {
        method: PaymentMethod.CreditCard,
        transactionId: 'txn-123',
      });
      order = await service.markShipped(order.id, {
        carrier: 'USPS',
        trackingNumber: '1234567890',
      });

      const updated = await service.markDelivered(order.id);

      expect(updated.status).toBe(OrderStatus.Completed);
      expect(updated.shipmentTracking!.deliveredAt).toBeDefined();

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OrderEventTypes.DELIVERED,
        })
      );
    });
  });

  describe('cancel', () => {
    it('cancels order and releases held listings', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish');
      let order = await service.create('customer-123', shippingAddress);
      order = await service.addLineItem(order.id, 'listing-1');
      order = await service.checkout(order.id);

      const cancelled = await service.cancel(order.id, 'Customer request');

      expect(cancelled.status).toBe(OrderStatus.Cancelled);
      expect(cancelled.cancelReason).toBe('Customer request');
      expect(listingClient.isHeld('listing-1')).toBe(false);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OrderEventTypes.CANCELLED,
          payload: { orderId: order.id, reason: 'Customer request' },
        })
      );
    });
  });

  describe('getById', () => {
    it('returns order by ID', async () => {
      const order = await service.create('customer-123', shippingAddress);

      const found = await service.getById(order.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(order.id);
    });

    it('returns null for non-existent order', async () => {
      const found = await service.getById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('getByCustomerId', () => {
    it('returns orders for customer', async () => {
      await service.create('customer-123', shippingAddress);
      await service.create('customer-123', shippingAddress);
      await service.create('customer-456', shippingAddress);

      const orders = await service.getByCustomerId('customer-123');

      expect(orders).toHaveLength(2);
    });
  });

  describe('releaseExpiredCheckouts', () => {
    it('releases expired checkout orders', async () => {
      let order = await service.create('customer-123', shippingAddress);
      order = await service.addLineItem(order.id, 'listing-1');
      order = await service.checkout(order.id);

      // Wait a tiny bit
      await new Promise(resolve => setTimeout(resolve, 5));

      // Use a very short timeout to trigger expiration
      const released = await service.releaseExpiredCheckouts(-1);

      expect(released).toBe(1);
      expect(listingClient.isHeld('listing-1')).toBe(false);

      const updated = await service.getById(order.id);
      expect(updated!.status).toBe(OrderStatus.Cancelled);
    });
  });
});
