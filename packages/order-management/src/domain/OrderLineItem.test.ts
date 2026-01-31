import { describe, it, expect } from 'vitest';
import { OrderLineItem, LineItemStatus } from './OrderLineItem.js';
import { BookCondition } from './BookCondition.js';
import { Money } from './Money.js';

describe('OrderLineItem', () => {
  const validProps = {
    listingId: 'listing-123',
    isbn: '978-0-13-468599-1',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    condition: BookCondition.Good,
    price: new Money(1999),
  };

  describe('create', () => {
    it('creates a line item with valid props', () => {
      const item = OrderLineItem.create(validProps);

      expect(item.listingId).toBe('listing-123');
      expect(item.isbn).toBe('978-0-13-468599-1');
      expect(item.title).toBe('Clean Code');
      expect(item.author).toBe('Robert C. Martin');
      expect(item.condition).toBe(BookCondition.Good);
      expect(item.price.amount).toBe(1999);
      expect(item.status).toBe(LineItemStatus.Pending);
    });

    it('throws error when listingId is empty', () => {
      expect(() =>
        OrderLineItem.create({ ...validProps, listingId: '' })
      ).toThrow('Listing ID is required');
    });

    it('throws error when isbn is empty', () => {
      expect(() =>
        OrderLineItem.create({ ...validProps, isbn: '' })
      ).toThrow('ISBN is required');
    });

    it('throws error when title is empty', () => {
      expect(() =>
        OrderLineItem.create({ ...validProps, title: '' })
      ).toThrow('Title is required');
    });

    it('throws error when author is empty', () => {
      expect(() =>
        OrderLineItem.create({ ...validProps, author: '' })
      ).toThrow('Author is required');
    });
  });

  describe('status transitions', () => {
    it('marks item as held', () => {
      const item = OrderLineItem.create(validProps);
      const heldItem = item.markHeld();

      expect(heldItem.status).toBe(LineItemStatus.Held);
      expect(item.status).toBe(LineItemStatus.Pending); // Original unchanged
    });

    it('marks held item as sold', () => {
      const item = OrderLineItem.create(validProps).markHeld();
      const soldItem = item.markSold();

      expect(soldItem.status).toBe(LineItemStatus.Sold);
    });

    it('releases held item', () => {
      const item = OrderLineItem.create(validProps).markHeld();
      const releasedItem = item.release();

      expect(releasedItem.status).toBe(LineItemStatus.Released);
    });

    it('throws when marking non-pending item as held', () => {
      const item = OrderLineItem.create(validProps).markHeld();
      expect(() => item.markHeld()).toThrow('Can only hold pending items');
    });

    it('throws when marking non-held item as sold', () => {
      const item = OrderLineItem.create(validProps);
      expect(() => item.markSold()).toThrow('Can only mark held items as sold');
    });

    it('throws when releasing non-held item', () => {
      const item = OrderLineItem.create(validProps);
      expect(() => item.release()).toThrow('Can only release held items');
    });
  });

  describe('reconstruct', () => {
    it('reconstructs a line item with given status', () => {
      const item = OrderLineItem.reconstruct({
        ...validProps,
        status: LineItemStatus.Sold,
      });

      expect(item.listingId).toBe('listing-123');
      expect(item.status).toBe(LineItemStatus.Sold);
    });
  });

  describe('toJSON', () => {
    it('serializes to plain object', () => {
      const item = OrderLineItem.create(validProps);

      expect(item.toJSON()).toEqual({
        listingId: 'listing-123',
        isbn: '978-0-13-468599-1',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        condition: BookCondition.Good,
        priceAmount: 1999,
        priceCurrency: 'USD',
        status: LineItemStatus.Pending,
      });
    });
  });
});
