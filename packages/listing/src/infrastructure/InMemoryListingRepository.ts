import { Listing } from '../domain/Listing.js';
import { ListingStatus } from '../domain/ListingStatus.js';
import { SearchCriteria, SearchResult } from '../domain/SearchCriteria.js';
import { ListingRepository } from './ListingRepository.js';

export class InMemoryListingRepository implements ListingRepository {
  private listings = new Map<string, Listing>();

  async save(listing: Listing): Promise<void> {
    this.listings.set(listing.id, listing);
  }

  async findById(id: string): Promise<Listing | null> {
    return this.listings.get(id) ?? null;
  }

  async findByIsbn(isbn: string): Promise<Listing | null> {
    for (const listing of this.listings.values()) {
      if (
        listing.bookInfo.isbn === isbn &&
        (listing.status === ListingStatus.Available ||
          listing.status === ListingStatus.Held)
      ) {
        return listing;
      }
    }
    return null;
  }

  async search(criteria: SearchCriteria): Promise<SearchResult<Listing>> {
    const page = criteria.page ?? 1;
    const pageSize = criteria.pageSize ?? 20;

    let results = Array.from(this.listings.values()).filter(
      listing => listing.status === ListingStatus.Available
    );

    // Text search
    if (criteria.q) {
      const query = criteria.q.toLowerCase();
      results = results.filter(listing => {
        const { title, author, isbn } = listing.bookInfo;
        return (
          title.toLowerCase().includes(query) ||
          author.toLowerCase().includes(query) ||
          isbn.toLowerCase().includes(query)
        );
      });
    }

    // Condition filter
    if (criteria.conditions && criteria.conditions.length > 0) {
      results = results.filter(listing =>
        criteria.conditions!.includes(listing.bookInfo.condition)
      );
    }

    // Price filters
    if (criteria.minPrice !== undefined) {
      results = results.filter(
        listing => listing.listingPrice.toDollars() >= criteria.minPrice!
      );
    }
    if (criteria.maxPrice !== undefined) {
      results = results.filter(
        listing => listing.listingPrice.toDollars() <= criteria.maxPrice!
      );
    }

    // Sorting
    switch (criteria.sort) {
      case 'price_asc':
        results.sort((a, b) => a.listingPrice.amount - b.listingPrice.amount);
        break;
      case 'price_desc':
        results.sort((a, b) => b.listingPrice.amount - a.listingPrice.amount);
        break;
      case 'date_newest':
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'date_oldest':
        results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'title':
        results.sort((a, b) =>
          a.bookInfo.title.localeCompare(b.bookInfo.title)
        );
        break;
    }

    const total = results.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const items = results.slice(startIndex, startIndex + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async findExpiredHolds(): Promise<Listing[]> {
    return Array.from(this.listings.values()).filter(
      listing => listing.status === ListingStatus.Held && listing.isHoldExpired()
    );
  }

  async findAll(): Promise<Listing[]> {
    return Array.from(this.listings.values());
  }
}
