import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ListingService, AppraisedBook } from './ListingService.js';
import { PricingService } from './PricingService.js';
import { InMemoryListingRepository } from '../infrastructure/InMemoryListingRepository.js';
import { EventBus } from '@valuebooks/shared';
import { BookCondition } from '../domain/BookCondition.js';
import { ListingStatus } from '../domain/ListingStatus.js';
import { ListingEventTypes } from '../domain/events/index.js';

describe('ListingService', () => {
  let listingService: ListingService;
  let repository: InMemoryListingRepository;
  let eventBus: EventBus;
  let pricingService: PricingService;

  const createAppraisedBook = (overrides: Partial<AppraisedBook> = {}): AppraisedBook => ({
    isbn: '978-0-13-468599-1',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    condition: BookCondition.Excellent,
    offerPrice: 600, // cents
    coverImageUrl: 'https://example.com/cover.jpg',
    publisher: 'Prentice Hall',
    publishYear: 2008,
    description: 'A Handbook of Agile Software Craftsmanship',
    ...overrides,
  });

  beforeEach(() => {
    repository = new InMemoryListingRepository();
    eventBus = new EventBus();
    pricingService = new PricingService();
    listingService = new ListingService(repository, eventBus, pricingService);
  });

  describe('handleAppraisalCompleted', () => {
    it('should create listings for each appraised book', async () => {
      const books = [
        createAppraisedBook({ isbn: '111', title: 'Book 1' }),
        createAppraisedBook({ isbn: '222', title: 'Book 2' }),
      ];

      const listings = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );

      expect(listings.length).toBe(2);
      expect(listings[0].bookInfo.isbn).toBe('111');
      expect(listings[1].bookInfo.isbn).toBe('222');
    });

    it('should calculate listing price using pricing service', async () => {
      const books = [
        createAppraisedBook({ offerPrice: 600, condition: BookCondition.Good }),
      ];

      const listings = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );

      // Good condition = 50% markup: $6 * 1.5 = $9
      expect(listings[0].listingPrice.toDollars()).toBe(9);
    });

    it('should set source appraisal and purchase request ids', async () => {
      const books = [createAppraisedBook()];

      const listings = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );

      expect(listings[0].sourceAppraisalId).toBe('appraisal-123');
      expect(listings[0].purchaseRequestId).toBe('pr-456');
    });

    it('should publish ListingCreated events', async () => {
      const handler = vi.fn();
      eventBus.subscribe(ListingEventTypes.CREATED, handler);

      const books = [createAppraisedBook()];

      await listingService.handleAppraisalCompleted('appraisal-123', 'pr-456', books);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ListingEventTypes.CREATED,
          payload: expect.objectContaining({
            isbn: '978-0-13-468599-1',
            title: 'Clean Code',
          }),
        })
      );
    });

    it('should save listings to repository', async () => {
      const books = [createAppraisedBook()];

      const listings = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );

      const found = await repository.findById(listings[0].id);
      expect(found).not.toBeNull();
    });
  });

  describe('getById', () => {
    it('should return listing by id', async () => {
      const books = [createAppraisedBook()];
      const [listing] = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );

      const found = await listingService.getById(listing.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(listing.id);
    });

    it('should return null for non-existent id', async () => {
      const found = await listingService.getById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('getByIsbn', () => {
    it('should return available listing by ISBN', async () => {
      const books = [createAppraisedBook({ isbn: '978-1-111-11111-1' })];
      await listingService.handleAppraisalCompleted('appraisal-123', 'pr-456', books);

      const found = await listingService.getByIsbn('978-1-111-11111-1');

      expect(found).not.toBeNull();
      expect(found!.bookInfo.isbn).toBe('978-1-111-11111-1');
    });
  });

  describe('search', () => {
    it('should search listings with criteria', async () => {
      const books = [
        createAppraisedBook({ isbn: '111', title: 'Clean Code' }),
        createAppraisedBook({ isbn: '222', title: 'Design Patterns' }),
      ];
      await listingService.handleAppraisalCompleted('appraisal-123', 'pr-456', books);

      const result = await listingService.search({ q: 'Clean' });

      expect(result.items.length).toBe(1);
      expect(result.items[0].bookInfo.title).toBe('Clean Code');
    });
  });

  describe('holdForOrder', () => {
    it('should hold listing for an order', async () => {
      const books = [createAppraisedBook()];
      const [listing] = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );

      const held = await listingService.holdForOrder(listing.id, 'order-789');

      expect(held.status).toBe(ListingStatus.Held);
      expect(held.heldByOrderId).toBe('order-789');
    });

    it('should publish ListingHeld event', async () => {
      const handler = vi.fn();
      eventBus.subscribe(ListingEventTypes.HELD, handler);

      const books = [createAppraisedBook()];
      const [listing] = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );

      await listingService.holdForOrder(listing.id, 'order-789');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ListingEventTypes.HELD,
          payload: expect.objectContaining({
            listingId: listing.id,
            orderId: 'order-789',
          }),
        })
      );
    });

    it('should throw for non-existent listing', async () => {
      await expect(
        listingService.holdForOrder('non-existent', 'order-789')
      ).rejects.toThrow('Listing not found');
    });
  });

  describe('releaseHold', () => {
    it('should release held listing', async () => {
      const books = [createAppraisedBook()];
      const [listing] = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );
      await listingService.holdForOrder(listing.id, 'order-789');

      const released = await listingService.releaseHold(listing.id);

      expect(released.status).toBe(ListingStatus.Available);
    });

    it('should publish ListingHoldReleased event', async () => {
      const handler = vi.fn();
      eventBus.subscribe(ListingEventTypes.HOLD_RELEASED, handler);

      const books = [createAppraisedBook()];
      const [listing] = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );
      await listingService.holdForOrder(listing.id, 'order-789');

      await listingService.releaseHold(listing.id);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ListingEventTypes.HOLD_RELEASED,
          payload: expect.objectContaining({
            listingId: listing.id,
            previousOrderId: 'order-789',
          }),
        })
      );
    });
  });

  describe('markSold', () => {
    it('should mark held listing as sold', async () => {
      const books = [createAppraisedBook()];
      const [listing] = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );
      await listingService.holdForOrder(listing.id, 'order-789');

      const sold = await listingService.markSold(listing.id);

      expect(sold.status).toBe(ListingStatus.Sold);
      expect(sold.soldAt).toBeInstanceOf(Date);
    });

    it('should publish ListingSold event', async () => {
      const handler = vi.fn();
      eventBus.subscribe(ListingEventTypes.SOLD, handler);

      const books = [createAppraisedBook()];
      const [listing] = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );
      await listingService.holdForOrder(listing.id, 'order-789');

      await listingService.markSold(listing.id);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ListingEventTypes.SOLD,
          payload: expect.objectContaining({
            listingId: listing.id,
            orderId: 'order-789',
          }),
        })
      );
    });
  });

  describe('withdraw', () => {
    it('should withdraw available listing', async () => {
      const books = [createAppraisedBook()];
      const [listing] = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );

      const withdrawn = await listingService.withdraw(listing.id, 'Damaged');

      expect(withdrawn.status).toBe(ListingStatus.Withdrawn);
      expect(withdrawn.withdrawReason).toBe('Damaged');
    });

    it('should publish ListingWithdrawn event', async () => {
      const handler = vi.fn();
      eventBus.subscribe(ListingEventTypes.WITHDRAWN, handler);

      const books = [createAppraisedBook()];
      const [listing] = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );

      await listingService.withdraw(listing.id, 'Damaged');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ListingEventTypes.WITHDRAWN,
          payload: expect.objectContaining({
            listingId: listing.id,
            reason: 'Damaged',
          }),
        })
      );
    });
  });

  describe('releaseExpiredHolds', () => {
    it('should release expired holds and return count', async () => {
      vi.useFakeTimers();

      const books = [
        createAppraisedBook({ isbn: '111' }),
        createAppraisedBook({ isbn: '222' }),
      ];
      const listings = await listingService.handleAppraisalCompleted(
        'appraisal-123',
        'pr-456',
        books
      );

      await listingService.holdForOrder(listings[0].id, 'order-1');
      await listingService.holdForOrder(listings[1].id, 'order-2');

      // Advance time past hold expiration (default 15 minutes)
      vi.advanceTimersByTime(20 * 60 * 1000);

      const releasedCount = await listingService.releaseExpiredHolds();

      expect(releasedCount).toBe(2);

      const listing1 = await listingService.getById(listings[0].id);
      const listing2 = await listingService.getById(listings[1].id);
      expect(listing1!.status).toBe(ListingStatus.Available);
      expect(listing2!.status).toBe(ListingStatus.Available);

      vi.useRealTimers();
    });
  });
});
