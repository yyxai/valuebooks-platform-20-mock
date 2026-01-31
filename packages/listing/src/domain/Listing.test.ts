import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Listing } from './Listing.js';
import { ListingStatus } from './ListingStatus.js';
import { BookInfo } from './BookInfo.js';
import { BookCondition } from './BookCondition.js';
import { Money } from './Money.js';

describe('Listing', () => {
  const createBookInfo = () => new BookInfo({
    isbn: '978-0-13-468599-1',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    condition: BookCondition.Excellent,
  });

  const offerPrice = Money.fromDollars(6);
  const listingPrice = Money.fromDollars(9);
  const appraisalId = 'appraisal-123';
  const purchaseRequestId = 'pr-456';

  describe('creation', () => {
    it('should create a listing with Available status', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      expect(listing.id).toBeDefined();
      expect(listing.status).toBe(ListingStatus.Available);
      expect(listing.bookInfo.isbn).toBe('978-0-13-468599-1');
      expect(listing.sourceAppraisalId).toBe(appraisalId);
      expect(listing.purchaseRequestId).toBe(purchaseRequestId);
      expect(listing.offerPrice.amount).toBe(600);
      expect(listing.listingPrice.amount).toBe(900);
      expect(listing.createdAt).toBeInstanceOf(Date);
      expect(listing.updatedAt).toBeInstanceOf(Date);
    });

    it('should not have hold or sold data on creation', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      expect(listing.heldByOrderId).toBeUndefined();
      expect(listing.heldUntil).toBeUndefined();
      expect(listing.soldAt).toBeUndefined();
    });
  });

  describe('hold()', () => {
    it('should hold listing for an order', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      const orderId = 'order-789';
      const holdDurationMinutes = 15;

      listing.hold(orderId, holdDurationMinutes);

      expect(listing.status).toBe(ListingStatus.Held);
      expect(listing.heldByOrderId).toBe(orderId);
      expect(listing.heldUntil).toBeInstanceOf(Date);
      expect(listing.heldUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw when holding a non-available listing', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      listing.hold('order-1', 15);

      expect(() => listing.hold('order-2', 15)).toThrow(
        'Cannot hold: listing is not available'
      );
    });

    it('should throw when holding a sold listing', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      listing.hold('order-1', 15);
      listing.markSold();

      expect(() => listing.hold('order-2', 15)).toThrow(
        'Cannot hold: listing is not available'
      );
    });
  });

  describe('release()', () => {
    it('should release a held listing back to available', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      listing.hold('order-1', 15);
      listing.release();

      expect(listing.status).toBe(ListingStatus.Available);
      expect(listing.heldByOrderId).toBeUndefined();
      expect(listing.heldUntil).toBeUndefined();
    });

    it('should throw when releasing a non-held listing', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      expect(() => listing.release()).toThrow(
        'Cannot release: listing is not held'
      );
    });
  });

  describe('markSold()', () => {
    it('should mark a held listing as sold', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      listing.hold('order-1', 15);
      listing.markSold();

      expect(listing.status).toBe(ListingStatus.Sold);
      expect(listing.soldAt).toBeInstanceOf(Date);
    });

    it('should throw when marking non-held listing as sold', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      expect(() => listing.markSold()).toThrow(
        'Cannot mark sold: listing is not held'
      );
    });
  });

  describe('withdraw()', () => {
    it('should withdraw an available listing', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      listing.withdraw('Damaged during handling');

      expect(listing.status).toBe(ListingStatus.Withdrawn);
      expect(listing.withdrawReason).toBe('Damaged during handling');
    });

    it('should withdraw a held listing', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      listing.hold('order-1', 15);
      listing.withdraw('Book not found in warehouse');

      expect(listing.status).toBe(ListingStatus.Withdrawn);
    });

    it('should throw when withdrawing a sold listing', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      listing.hold('order-1', 15);
      listing.markSold();

      expect(() => listing.withdraw()).toThrow(
        'Cannot withdraw: listing is sold'
      );
    });

    it('should throw when withdrawing an already withdrawn listing', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      listing.withdraw();

      expect(() => listing.withdraw()).toThrow(
        'Cannot withdraw: listing is already withdrawn'
      );
    });
  });

  describe('isHoldExpired()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return false when listing is not held', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      expect(listing.isHoldExpired()).toBe(false);
    });

    it('should return false when hold has not expired', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      listing.hold('order-1', 15);

      expect(listing.isHoldExpired()).toBe(false);
    });

    it('should return true when hold has expired', () => {
      const listing = Listing.create({
        bookInfo: createBookInfo(),
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      listing.hold('order-1', 15);

      // Advance time by 16 minutes
      vi.advanceTimersByTime(16 * 60 * 1000);

      expect(listing.isHoldExpired()).toBe(true);
    });
  });

  describe('reconstruct()', () => {
    it('should reconstruct a listing from stored data', () => {
      const id = 'listing-abc';
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');
      const bookInfo = createBookInfo();

      const listing = Listing.reconstruct({
        id,
        bookInfo,
        sourceAppraisalId: appraisalId,
        purchaseRequestId: purchaseRequestId,
        status: ListingStatus.Held,
        offerPrice,
        listingPrice,
        heldByOrderId: 'order-123',
        heldUntil: new Date('2024-01-02T12:00:00Z'),
        createdAt,
        updatedAt,
      });

      expect(listing.id).toBe(id);
      expect(listing.status).toBe(ListingStatus.Held);
      expect(listing.heldByOrderId).toBe('order-123');
      expect(listing.createdAt).toBe(createdAt);
    });
  });
});
