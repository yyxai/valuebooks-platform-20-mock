import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryOrderRepository } from './InMemoryOrderRepository.js';
import { Order } from '../domain/Order.js';
import { OrderLineItem } from '../domain/OrderLineItem.js';
import { Address } from '../domain/Address.js';
import { Money } from '../domain/Money.js';
import { BookCondition } from '../domain/BookCondition.js';

describe('InMemoryOrderRepository', () => {
  let repository: InMemoryOrderRepository;
  let shippingAddress: Address;

  beforeEach(() => {
    repository = new InMemoryOrderRepository();
    shippingAddress = Address.create({
      name: 'John Doe',
      street1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
    });
  });

  function createOrder(customerId: string = 'customer-123') {
    return Order.create({ customerId, shippingAddress });
  }

  function createLineItem(listingId: string = 'listing-1') {
    return OrderLineItem.create({
      listingId,
      isbn: '978-0-13-468599-1',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      condition: BookCondition.Good,
      price: new Money(1999),
    });
  }

  describe('save and findById', () => {
    it('saves and retrieves an order', async () => {
      const order = createOrder();
      await repository.save(order);

      const found = await repository.findById(order.id);

      expect(found).toBe(order);
    });

    it('returns null for non-existent order', async () => {
      const found = await repository.findById('non-existent');

      expect(found).toBeNull();
    });

    it('updates an existing order', async () => {
      const order = createOrder();
      await repository.save(order);

      const updated = order.addLineItem(createLineItem());
      await repository.save(updated);

      const found = await repository.findById(order.id);

      expect(found?.lineItems).toHaveLength(1);
    });
  });

  describe('findByCustomerId', () => {
    it('returns orders for a customer', async () => {
      const order1 = createOrder('customer-1');
      const order2 = createOrder('customer-1');
      const order3 = createOrder('customer-2');

      await repository.save(order1);
      await repository.save(order2);
      await repository.save(order3);

      const found = await repository.findByCustomerId('customer-1');

      expect(found).toHaveLength(2);
      expect(found.map(o => o.id).sort()).toEqual([order1.id, order2.id].sort());
    });

    it('returns empty array for customer with no orders', async () => {
      const found = await repository.findByCustomerId('non-existent');

      expect(found).toEqual([]);
    });
  });

  describe('findExpiredCheckouts', () => {
    it('returns orders in CheckingOut status past timeout', async () => {
      const order = createOrder()
        .addLineItem(createLineItem())
        .startCheckout();

      await repository.save(order);

      // Wait a tiny bit so order age > 0
      await new Promise(resolve => setTimeout(resolve, 5));

      // With timeout of -1, any age > 0 should be expired
      const expiredOrders = await repository.findExpiredCheckouts(-1);

      expect(expiredOrders).toHaveLength(1);
      expect(expiredOrders[0].id).toBe(order.id);
    });

    it('does not return orders still within timeout', async () => {
      const order = createOrder()
        .addLineItem(createLineItem())
        .startCheckout()
        .confirmHoldings(['listing-1']);

      await repository.save(order);

      // With a long timeout, order should not be expired
      const expiredOrders = await repository.findExpiredCheckouts(60 * 60 * 1000);

      expect(expiredOrders).toHaveLength(0);
    });

    it('does not return non-CheckingOut orders', async () => {
      const draftOrder = createOrder();
      await repository.save(draftOrder);

      const expiredOrders = await repository.findExpiredCheckouts(-1);

      expect(expiredOrders).toHaveLength(0);
    });
  });

  describe('findAll', () => {
    it('returns all orders', async () => {
      const order1 = createOrder('customer-1');
      const order2 = createOrder('customer-2');

      await repository.save(order1);
      await repository.save(order2);

      const all = await repository.findAll();

      expect(all).toHaveLength(2);
    });

    it('returns empty array when no orders', async () => {
      const all = await repository.findAll();

      expect(all).toEqual([]);
    });
  });
});
