import { describe, it, expect, beforeEach } from 'vitest';
import { Order } from './Order.js';
import { OrderStatus } from './OrderStatus.js';
import { OrderLineItem, LineItemStatus } from './OrderLineItem.js';
import { Address } from './Address.js';
import { Money } from './Money.js';
import { BookCondition } from './BookCondition.js';
import { PaymentMethod } from './Payment.js';
import { ShipmentTracking } from './ShipmentTracking.js';

describe('Order', () => {
  let shippingAddress: Address;
  let billingAddress: Address;

  beforeEach(() => {
    shippingAddress = Address.create({
      name: 'John Doe',
      street1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
    });

    billingAddress = Address.create({
      name: 'John Doe',
      street1: '456 Oak Ave',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
    });
  });

  function createLineItem(overrides: Partial<{ listingId: string; price: number }> = {}) {
    return OrderLineItem.create({
      listingId: overrides.listingId ?? 'listing-1',
      isbn: '978-0-13-468599-1',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      condition: BookCondition.Good,
      price: new Money(overrides.price ?? 1999),
    });
  }

  describe('create', () => {
    it('creates a draft order', () => {
      const order = Order.create({
        customerId: 'customer-123',
        shippingAddress,
      });

      expect(order.id).toBeDefined();
      expect(order.customerId).toBe('customer-123');
      expect(order.status).toBe(OrderStatus.Draft);
      expect(order.lineItems).toEqual([]);
      expect(order.shippingAddress).toBe(shippingAddress);
      expect(order.billingAddress).toBeUndefined();
      expect(order.createdAt).toBeInstanceOf(Date);
      expect(order.updatedAt).toBeInstanceOf(Date);
    });

    it('creates order with billing address', () => {
      const order = Order.create({
        customerId: 'customer-123',
        shippingAddress,
        billingAddress,
      });

      expect(order.billingAddress).toBe(billingAddress);
    });

    it('throws when customerId is empty', () => {
      expect(() =>
        Order.create({ customerId: '', shippingAddress })
      ).toThrow('Customer ID is required');
    });
  });

  describe('addLineItem', () => {
    it('adds a line item to draft order', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress });
      const item = createLineItem();

      const updated = order.addLineItem(item);

      expect(updated.lineItems).toHaveLength(1);
      expect(updated.lineItems[0]).toBe(item);
      expect(order.lineItems).toHaveLength(0); // Original unchanged
    });

    it('throws when adding duplicate listing', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress });
      const item = createLineItem({ listingId: 'listing-1' });
      const updated = order.addLineItem(item);

      const duplicate = createLineItem({ listingId: 'listing-1' });
      expect(() => updated.addLineItem(duplicate)).toThrow('Listing already in order');
    });

    it('throws when adding to non-draft order', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem())
        .startCheckout();

      expect(() => order.addLineItem(createLineItem({ listingId: 'listing-2' }))).toThrow(
        'Can only add items to draft orders'
      );
    });
  });

  describe('removeLineItem', () => {
    it('removes a line item from draft order', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem({ listingId: 'listing-1' }))
        .addLineItem(createLineItem({ listingId: 'listing-2' }));

      const updated = order.removeLineItem('listing-1');

      expect(updated.lineItems).toHaveLength(1);
      expect(updated.lineItems[0].listingId).toBe('listing-2');
    });

    it('throws when removing non-existent item', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem());

      expect(() => order.removeLineItem('non-existent')).toThrow('Line item not found');
    });

    it('throws when removing from non-draft order', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem())
        .startCheckout();

      expect(() => order.removeLineItem('listing-1')).toThrow(
        'Can only remove items from draft orders'
      );
    });
  });

  describe('startCheckout', () => {
    it('transitions from Draft to CheckingOut', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem());

      const updated = order.startCheckout();

      expect(updated.status).toBe(OrderStatus.CheckingOut);
    });

    it('throws when order has no items', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress });

      expect(() => order.startCheckout()).toThrow('Cannot checkout empty order');
    });

    it('throws when not in Draft status', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem())
        .startCheckout();

      expect(() => order.startCheckout()).toThrow('Can only start checkout from draft');
    });
  });

  describe('confirmHoldings', () => {
    it('marks all items as held and transitions to PaymentPending', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem({ listingId: 'listing-1' }))
        .addLineItem(createLineItem({ listingId: 'listing-2' }))
        .startCheckout();

      const updated = order.confirmHoldings(['listing-1', 'listing-2']);

      expect(updated.status).toBe(OrderStatus.PaymentPending);
      expect(updated.lineItems.every(item => item.status === LineItemStatus.Held)).toBe(true);
    });

    it('throws when not all listings are confirmed', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem({ listingId: 'listing-1' }))
        .addLineItem(createLineItem({ listingId: 'listing-2' }))
        .startCheckout();

      expect(() => order.confirmHoldings(['listing-1'])).toThrow('Not all listings held');
    });

    it('throws when not in CheckingOut status', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem());

      expect(() => order.confirmHoldings(['listing-1'])).toThrow(
        'Can only confirm holdings during checkout'
      );
    });
  });

  describe('processPayment', () => {
    it('processes payment and marks items as sold', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem({ listingId: 'listing-1', price: 1000 }))
        .addLineItem(createLineItem({ listingId: 'listing-2', price: 500 }))
        .startCheckout()
        .confirmHoldings(['listing-1', 'listing-2']);

      const updated = order.processPayment({
        method: PaymentMethod.CreditCard,
        transactionId: 'txn-123',
      });

      expect(updated.status).toBe(OrderStatus.Confirmed);
      expect(updated.payment).toBeDefined();
      expect(updated.payment!.transactionId).toBe('txn-123');
      expect(updated.lineItems.every(item => item.status === LineItemStatus.Sold)).toBe(true);
    });

    it('throws when not in PaymentPending status', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem())
        .startCheckout();

      expect(() =>
        order.processPayment({ method: PaymentMethod.CreditCard, transactionId: 'txn-123' })
      ).toThrow('Can only process payment when payment is pending');
    });
  });

  describe('ship', () => {
    it('marks order as shipped with tracking', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem())
        .startCheckout()
        .confirmHoldings(['listing-1'])
        .processPayment({ method: PaymentMethod.CreditCard, transactionId: 'txn-123' });

      const tracking = ShipmentTracking.create({
        carrier: 'USPS',
        trackingNumber: '1234567890',
      });

      const updated = order.ship(tracking);

      expect(updated.status).toBe(OrderStatus.Shipped);
      expect(updated.shipmentTracking).toBe(tracking);
    });

    it('throws when not in Confirmed status', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem())
        .startCheckout()
        .confirmHoldings(['listing-1']);

      expect(() =>
        order.ship(ShipmentTracking.create({ carrier: 'USPS', trackingNumber: '123' }))
      ).toThrow('Can only ship confirmed orders');
    });
  });

  describe('markDelivered', () => {
    it('marks order as completed', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem())
        .startCheckout()
        .confirmHoldings(['listing-1'])
        .processPayment({ method: PaymentMethod.CreditCard, transactionId: 'txn-123' })
        .ship(ShipmentTracking.create({ carrier: 'USPS', trackingNumber: '123' }));

      const updated = order.markDelivered();

      expect(updated.status).toBe(OrderStatus.Completed);
      expect(updated.shipmentTracking!.deliveredAt).toBeInstanceOf(Date);
    });

    it('throws when not in Shipped status', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem())
        .startCheckout()
        .confirmHoldings(['listing-1'])
        .processPayment({ method: PaymentMethod.CreditCard, transactionId: 'txn-123' });

      expect(() => order.markDelivered()).toThrow('Can only mark shipped orders as delivered');
    });
  });

  describe('cancel', () => {
    it('cancels a draft order', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem());

      const cancelled = order.cancel('Customer changed mind');

      expect(cancelled.status).toBe(OrderStatus.Cancelled);
      expect(cancelled.cancelReason).toBe('Customer changed mind');
      expect(cancelled.cancelledAt).toBeInstanceOf(Date);
    });

    it('cancels order during checkout and releases held items', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem())
        .startCheckout()
        .confirmHoldings(['listing-1']);

      const cancelled = order.cancel();

      expect(cancelled.status).toBe(OrderStatus.Cancelled);
      expect(cancelled.lineItems[0].status).toBe(LineItemStatus.Released);
    });

    it('throws when cancelling shipped order', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem())
        .startCheckout()
        .confirmHoldings(['listing-1'])
        .processPayment({ method: PaymentMethod.CreditCard, transactionId: 'txn-123' })
        .ship(ShipmentTracking.create({ carrier: 'USPS', trackingNumber: '123' }));

      expect(() => order.cancel()).toThrow('Cannot cancel shipped or completed orders');
    });

    it('throws when cancelling completed order', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem())
        .startCheckout()
        .confirmHoldings(['listing-1'])
        .processPayment({ method: PaymentMethod.CreditCard, transactionId: 'txn-123' })
        .ship(ShipmentTracking.create({ carrier: 'USPS', trackingNumber: '123' }))
        .markDelivered();

      expect(() => order.cancel()).toThrow('Cannot cancel shipped or completed orders');
    });
  });

  describe('totals', () => {
    it('calculates subtotal from line items', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem({ listingId: 'listing-1', price: 1000 }))
        .addLineItem(createLineItem({ listingId: 'listing-2', price: 1500 }));

      expect(order.subtotal.amount).toBe(2500);
    });

    it('returns zero subtotal for empty order', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress });

      expect(order.subtotal.amount).toBe(0);
    });

    it('calculates total with tax and shipping', () => {
      const order = Order.create({
        customerId: 'customer-123',
        shippingAddress,
        tax: new Money(200),
        shipping: new Money(500),
      }).addLineItem(createLineItem({ price: 1000 }));

      expect(order.subtotal.amount).toBe(1000);
      expect(order.tax.amount).toBe(200);
      expect(order.shipping.amount).toBe(500);
      expect(order.total.amount).toBe(1700);
    });
  });

  describe('getHeldListingIds', () => {
    it('returns listing IDs of held items', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem({ listingId: 'listing-1' }))
        .addLineItem(createLineItem({ listingId: 'listing-2' }))
        .startCheckout()
        .confirmHoldings(['listing-1', 'listing-2']);

      expect(order.getHeldListingIds()).toEqual(['listing-1', 'listing-2']);
    });

    it('returns empty array for draft order', () => {
      const order = Order.create({ customerId: 'customer-123', shippingAddress })
        .addLineItem(createLineItem());

      expect(order.getHeldListingIds()).toEqual([]);
    });
  });
});
