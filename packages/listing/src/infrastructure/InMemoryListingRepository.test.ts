import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InMemoryListingRepository } from './InMemoryListingRepository.js';
import { Listing } from '../domain/Listing.js';
import { BookInfo } from '../domain/BookInfo.js';
import { BookCondition } from '../domain/BookCondition.js';
import { Money } from '../domain/Money.js';
import { ListingStatus } from '../domain/ListingStatus.js';

describe('InMemoryListingRepository', () => {
  let repository: InMemoryListingRepository;

  const createListing = (overrides: Partial<{
    isbn: string;
    title: string;
    author: string;
    condition: BookCondition;
    listingPrice: number;
  }> = {}) => {
    const bookInfo = new BookInfo({
      isbn: overrides.isbn ?? '978-0-13-468599-1',
      title: overrides.title ?? 'Clean Code',
      author: overrides.author ?? 'Robert C. Martin',
      condition: overrides.condition ?? BookCondition.Excellent,
    });

    return Listing.create({
      bookInfo,
      sourceAppraisalId: 'appraisal-123',
      purchaseRequestId: 'pr-456',
      offerPrice: Money.fromDollars(6),
      listingPrice: Money.fromDollars(overrides.listingPrice ?? 9),
    });
  };

  beforeEach(() => {
    repository = new InMemoryListingRepository();
  });

  describe('save and findById', () => {
    it('should save and retrieve a listing by id', async () => {
      const listing = createListing();
      await repository.save(listing);

      const found = await repository.findById(listing.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(listing.id);
      expect(found!.bookInfo.isbn).toBe('978-0-13-468599-1');
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non-existent');
      expect(found).toBeNull();
    });

    it('should update existing listing on save', async () => {
      const listing = createListing();
      await repository.save(listing);

      listing.hold('order-1', 15);
      await repository.save(listing);

      const found = await repository.findById(listing.id);
      expect(found!.status).toBe(ListingStatus.Held);
    });
  });

  describe('findByIsbn', () => {
    it('should find available listing by ISBN', async () => {
      const listing = createListing({ isbn: '978-1-111-11111-1' });
      await repository.save(listing);

      const found = await repository.findByIsbn('978-1-111-11111-1');

      expect(found).not.toBeNull();
      expect(found!.bookInfo.isbn).toBe('978-1-111-11111-1');
    });

    it('should return null for non-existent ISBN', async () => {
      const found = await repository.findByIsbn('non-existent');
      expect(found).toBeNull();
    });

    it('should not return sold listings', async () => {
      const listing = createListing({ isbn: '978-1-111-11111-1' });
      await repository.save(listing);

      listing.hold('order-1', 15);
      listing.markSold();
      await repository.save(listing);

      const found = await repository.findByIsbn('978-1-111-11111-1');
      expect(found).toBeNull();
    });

    it('should return first available when multiple listings have same ISBN', async () => {
      const listing1 = createListing({ isbn: '978-1-111-11111-1' });
      const listing2 = createListing({ isbn: '978-1-111-11111-1' });
      await repository.save(listing1);
      await repository.save(listing2);

      const found = await repository.findByIsbn('978-1-111-11111-1');

      expect(found).not.toBeNull();
      expect(found!.status).toBe(ListingStatus.Available);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await repository.save(createListing({
        isbn: '978-0-13-468599-1',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        condition: BookCondition.Excellent,
        listingPrice: 15,
      }));
      await repository.save(createListing({
        isbn: '978-0-13-235088-4',
        title: 'Clean Architecture',
        author: 'Robert C. Martin',
        condition: BookCondition.Good,
        listingPrice: 20,
      }));
      await repository.save(createListing({
        isbn: '978-0-201-63361-0',
        title: 'Design Patterns',
        author: 'Gang of Four',
        condition: BookCondition.Fair,
        listingPrice: 10,
      }));
    });

    it('should return all available listings with empty criteria', async () => {
      const result = await repository.search({});

      expect(result.items.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it('should search by title', async () => {
      const result = await repository.search({ q: 'Clean' });

      expect(result.items.length).toBe(2);
      expect(result.items.every(l => l.bookInfo.title.includes('Clean'))).toBe(true);
    });

    it('should search by author', async () => {
      const result = await repository.search({ q: 'Martin' });

      expect(result.items.length).toBe(2);
    });

    it('should search by ISBN', async () => {
      const result = await repository.search({ q: '978-0-201-63361-0' });

      expect(result.items.length).toBe(1);
      expect(result.items[0].bookInfo.title).toBe('Design Patterns');
    });

    it('should be case insensitive', async () => {
      const result = await repository.search({ q: 'clean' });

      expect(result.items.length).toBe(2);
    });

    it('should filter by condition', async () => {
      const result = await repository.search({
        conditions: [BookCondition.Excellent, BookCondition.Good],
      });

      expect(result.items.length).toBe(2);
      expect(result.items.some(l => l.bookInfo.condition === BookCondition.Fair)).toBe(false);
    });

    it('should filter by min price', async () => {
      const result = await repository.search({ minPrice: 15 });

      expect(result.items.length).toBe(2);
      expect(result.items.every(l => l.listingPrice.toDollars() >= 15)).toBe(true);
    });

    it('should filter by max price', async () => {
      const result = await repository.search({ maxPrice: 15 });

      expect(result.items.length).toBe(2);
      expect(result.items.every(l => l.listingPrice.toDollars() <= 15)).toBe(true);
    });

    it('should sort by price ascending', async () => {
      const result = await repository.search({ sort: 'price_asc' });

      expect(result.items[0].listingPrice.toDollars()).toBe(10);
      expect(result.items[2].listingPrice.toDollars()).toBe(20);
    });

    it('should sort by price descending', async () => {
      const result = await repository.search({ sort: 'price_desc' });

      expect(result.items[0].listingPrice.toDollars()).toBe(20);
      expect(result.items[2].listingPrice.toDollars()).toBe(10);
    });

    it('should sort by title', async () => {
      const result = await repository.search({ sort: 'title' });

      expect(result.items[0].bookInfo.title).toBe('Clean Architecture');
      expect(result.items[1].bookInfo.title).toBe('Clean Code');
      expect(result.items[2].bookInfo.title).toBe('Design Patterns');
    });

    it('should paginate results', async () => {
      const page1 = await repository.search({ page: 1, pageSize: 2 });
      const page2 = await repository.search({ page: 2, pageSize: 2 });

      expect(page1.items.length).toBe(2);
      expect(page1.page).toBe(1);
      expect(page1.pageSize).toBe(2);
      expect(page1.total).toBe(3);
      expect(page1.totalPages).toBe(2);

      expect(page2.items.length).toBe(1);
      expect(page2.page).toBe(2);
    });

    it('should not include sold or withdrawn listings', async () => {
      const listings = await repository.findAll();
      const soldListing = listings[0];
      soldListing.hold('order-1', 15);
      soldListing.markSold();
      await repository.save(soldListing);

      const result = await repository.search({});

      expect(result.items.length).toBe(2);
      expect(result.items.every(l => l.status === ListingStatus.Available)).toBe(true);
    });
  });

  describe('findExpiredHolds', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return listings with expired holds', async () => {
      const listing = createListing();
      await repository.save(listing);

      listing.hold('order-1', 15);
      await repository.save(listing);

      // Advance time by 20 minutes
      vi.advanceTimersByTime(20 * 60 * 1000);

      const expired = await repository.findExpiredHolds();

      expect(expired.length).toBe(1);
      expect(expired[0].id).toBe(listing.id);
    });

    it('should not return active holds', async () => {
      const listing = createListing();
      await repository.save(listing);

      listing.hold('order-1', 15);
      await repository.save(listing);

      const expired = await repository.findExpiredHolds();

      expect(expired.length).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should return all listings', async () => {
      await repository.save(createListing({ isbn: '111' }));
      await repository.save(createListing({ isbn: '222' }));

      const all = await repository.findAll();

      expect(all.length).toBe(2);
    });
  });
});
