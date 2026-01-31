import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createListingRoutes } from './routes.js';
import { ListingService, AppraisedBook } from '../services/ListingService.js';
import { PricingService } from '../services/PricingService.js';
import { InMemoryListingRepository } from '../infrastructure/InMemoryListingRepository.js';
import { EventBus } from '@valuebooks/shared';
import { BookCondition } from '../domain/BookCondition.js';
import { ListingStatus } from '../domain/ListingStatus.js';

describe('Listing API Routes', () => {
  let app: Hono;
  let listingService: ListingService;

  const createAppraisedBook = (overrides: Partial<AppraisedBook> = {}): AppraisedBook => ({
    isbn: '978-0-13-468599-1',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    condition: BookCondition.Excellent,
    offerPrice: 600,
    ...overrides,
  });

  beforeEach(async () => {
    const repository = new InMemoryListingRepository();
    const eventBus = new EventBus();
    const pricingService = new PricingService();
    listingService = new ListingService(repository, eventBus, pricingService);

    app = new Hono();
    app.route('/listings', createListingRoutes(listingService));
  });

  describe('GET /listings', () => {
    it('should return empty list when no listings', async () => {
      const res = await app.request('/listings');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should return listings with pagination', async () => {
      await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook({ isbn: '111', title: 'Book 1' }),
        createAppraisedBook({ isbn: '222', title: 'Book 2' }),
      ]);

      const res = await app.request('/listings');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items.length).toBe(2);
      expect(data.total).toBe(2);
      expect(data.page).toBe(1);
    });

    it('should search by query parameter', async () => {
      await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook({ isbn: '111', title: 'Clean Code' }),
        createAppraisedBook({ isbn: '222', title: 'Design Patterns' }),
      ]);

      const res = await app.request('/listings?q=Clean');

      const data = await res.json();
      expect(data.items.length).toBe(1);
      expect(data.items[0].bookInfo.title).toBe('Clean Code');
    });

    it('should filter by conditions', async () => {
      await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook({ isbn: '111', condition: BookCondition.Excellent }),
        createAppraisedBook({ isbn: '222', condition: BookCondition.Fair }),
      ]);

      const res = await app.request('/listings?conditions=excellent');

      const data = await res.json();
      expect(data.items.length).toBe(1);
      expect(data.items[0].bookInfo.condition).toBe('excellent');
    });

    it('should filter by price range', async () => {
      await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook({ isbn: '111', offerPrice: 500 }),  // $8 listing price (Excellent: 60%)
        createAppraisedBook({ isbn: '222', offerPrice: 1000 }), // $16 listing price
      ]);

      const res = await app.request('/listings?minPrice=10&maxPrice=20');

      const data = await res.json();
      expect(data.items.length).toBe(1);
    });

    it('should sort results', async () => {
      await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook({ isbn: '111', title: 'B Book', offerPrice: 1000 }),
        createAppraisedBook({ isbn: '222', title: 'A Book', offerPrice: 500 }),
      ]);

      const res = await app.request('/listings?sort=title');

      const data = await res.json();
      expect(data.items[0].bookInfo.title).toBe('A Book');
    });

    it('should paginate results', async () => {
      await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook({ isbn: '111' }),
        createAppraisedBook({ isbn: '222' }),
        createAppraisedBook({ isbn: '333' }),
      ]);

      const res = await app.request('/listings?page=2&pageSize=2');

      const data = await res.json();
      expect(data.items.length).toBe(1);
      expect(data.page).toBe(2);
      expect(data.pageSize).toBe(2);
      expect(data.totalPages).toBe(2);
    });
  });

  describe('GET /listings/:id', () => {
    it('should return listing by id', async () => {
      const [listing] = await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook(),
      ]);

      const res = await app.request(`/listings/${listing.id}`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(listing.id);
      expect(data.bookInfo.isbn).toBe('978-0-13-468599-1');
    });

    it('should return 404 for non-existent listing', async () => {
      const res = await app.request('/listings/non-existent');

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Listing not found');
    });
  });

  describe('GET /listings/isbn/:isbn', () => {
    it('should return listing by ISBN', async () => {
      await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook({ isbn: '978-1-111-11111-1' }),
      ]);

      const res = await app.request('/listings/isbn/978-1-111-11111-1');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.bookInfo.isbn).toBe('978-1-111-11111-1');
    });

    it('should return 404 for non-existent ISBN', async () => {
      const res = await app.request('/listings/isbn/non-existent');

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Listing not found');
    });
  });

  describe('POST /listings/:id/hold', () => {
    it('should hold listing for order', async () => {
      const [listing] = await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook(),
      ]);

      const res = await app.request(`/listings/${listing.id}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'order-123' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe(ListingStatus.Held);
      expect(data.heldByOrderId).toBe('order-123');
    });

    it('should return 404 for non-existent listing', async () => {
      const res = await app.request('/listings/non-existent/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'order-123' }),
      });

      expect(res.status).toBe(404);
    });

    it('should return 400 when holding non-available listing', async () => {
      const [listing] = await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook(),
      ]);
      await listingService.holdForOrder(listing.id, 'order-1');

      const res = await app.request(`/listings/${listing.id}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'order-2' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /listings/:id/release', () => {
    it('should release held listing', async () => {
      const [listing] = await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook(),
      ]);
      await listingService.holdForOrder(listing.id, 'order-123');

      const res = await app.request(`/listings/${listing.id}/release`, {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe(ListingStatus.Available);
    });
  });

  describe('POST /listings/:id/sold', () => {
    it('should mark held listing as sold', async () => {
      const [listing] = await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook(),
      ]);
      await listingService.holdForOrder(listing.id, 'order-123');

      const res = await app.request(`/listings/${listing.id}/sold`, {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe(ListingStatus.Sold);
    });
  });

  describe('POST /listings/:id/withdraw', () => {
    it('should withdraw listing', async () => {
      const [listing] = await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook(),
      ]);

      const res = await app.request(`/listings/${listing.id}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Damaged' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe(ListingStatus.Withdrawn);
      expect(data.withdrawReason).toBe('Damaged');
    });

    it('should withdraw without reason', async () => {
      const [listing] = await listingService.handleAppraisalCompleted('appraisal-1', 'pr-1', [
        createAppraisedBook(),
      ]);

      const res = await app.request(`/listings/${listing.id}/withdraw`, {
        method: 'POST',
      });

      expect(res.status).toBe(200);
    });
  });
});
