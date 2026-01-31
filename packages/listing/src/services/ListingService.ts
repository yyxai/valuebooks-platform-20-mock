import { EventBus } from '@valuebooks/shared';
import { Listing } from '../domain/Listing.js';
import { BookInfo } from '../domain/BookInfo.js';
import { BookCondition } from '../domain/BookCondition.js';
import { Money } from '../domain/Money.js';
import { SearchCriteria, SearchResult } from '../domain/SearchCriteria.js';
import { ListingEventTypes } from '../domain/events/index.js';
import { ListingRepository } from '../infrastructure/ListingRepository.js';
import { PricingService } from './PricingService.js';

export interface AppraisedBook {
  isbn: string;
  title: string;
  author: string;
  condition: BookCondition;
  offerPrice: number; // cents
  coverImageUrl?: string;
  publisher?: string;
  publishYear?: number;
  description?: string;
}

const DEFAULT_HOLD_DURATION_MINUTES = 15;

export class ListingService {
  constructor(
    private repository: ListingRepository,
    private eventBus: EventBus,
    private pricingService: PricingService
  ) {}

  async handleAppraisalCompleted(
    appraisalId: string,
    purchaseRequestId: string,
    books: AppraisedBook[]
  ): Promise<Listing[]> {
    const listings: Listing[] = [];

    for (const book of books) {
      const bookInfo = new BookInfo({
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        condition: book.condition,
        coverImageUrl: book.coverImageUrl,
        publisher: book.publisher,
        publishYear: book.publishYear,
        description: book.description,
      });

      const offerPrice = new Money(book.offerPrice);
      const listingPrice = this.pricingService.calculateListingPrice(
        offerPrice,
        book.condition
      );

      const listing = Listing.create({
        bookInfo,
        sourceAppraisalId: appraisalId,
        purchaseRequestId,
        offerPrice,
        listingPrice,
      });

      await this.repository.save(listing);

      this.eventBus.publish({
        type: ListingEventTypes.CREATED,
        payload: {
          listingId: listing.id,
          isbn: listing.bookInfo.isbn,
          title: listing.bookInfo.title,
          author: listing.bookInfo.author,
          condition: listing.bookInfo.condition,
          listingPrice: listing.listingPrice.amount,
          sourceAppraisalId: listing.sourceAppraisalId,
        },
        timestamp: new Date(),
      });

      listings.push(listing);
    }

    return listings;
  }

  async getById(listingId: string): Promise<Listing | null> {
    return this.repository.findById(listingId);
  }

  async getByIsbn(isbn: string): Promise<Listing | null> {
    return this.repository.findByIsbn(isbn);
  }

  async search(criteria: SearchCriteria): Promise<SearchResult<Listing>> {
    return this.repository.search(criteria);
  }

  async holdForOrder(listingId: string, orderId: string): Promise<Listing> {
    const listing = await this.repository.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    listing.hold(orderId, DEFAULT_HOLD_DURATION_MINUTES);
    await this.repository.save(listing);

    this.eventBus.publish({
      type: ListingEventTypes.HELD,
      payload: {
        listingId: listing.id,
        orderId,
        heldUntil: listing.heldUntil!,
      },
      timestamp: new Date(),
    });

    return listing;
  }

  async releaseHold(listingId: string): Promise<Listing> {
    const listing = await this.repository.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const previousOrderId = listing.heldByOrderId!;
    listing.release();
    await this.repository.save(listing);

    this.eventBus.publish({
      type: ListingEventTypes.HOLD_RELEASED,
      payload: {
        listingId: listing.id,
        previousOrderId,
      },
      timestamp: new Date(),
    });

    return listing;
  }

  async markSold(listingId: string): Promise<Listing> {
    const listing = await this.repository.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const orderId = listing.heldByOrderId!;
    listing.markSold();
    await this.repository.save(listing);

    this.eventBus.publish({
      type: ListingEventTypes.SOLD,
      payload: {
        listingId: listing.id,
        orderId,
        soldAt: listing.soldAt!,
        salePrice: listing.listingPrice.amount,
      },
      timestamp: new Date(),
    });

    return listing;
  }

  async withdraw(listingId: string, reason?: string): Promise<Listing> {
    const listing = await this.repository.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    listing.withdraw(reason);
    await this.repository.save(listing);

    this.eventBus.publish({
      type: ListingEventTypes.WITHDRAWN,
      payload: {
        listingId: listing.id,
        reason,
      },
      timestamp: new Date(),
    });

    return listing;
  }

  async releaseExpiredHolds(): Promise<number> {
    const expiredListings = await this.repository.findExpiredHolds();

    for (const listing of expiredListings) {
      const previousOrderId = listing.heldByOrderId!;
      listing.release();
      await this.repository.save(listing);

      this.eventBus.publish({
        type: ListingEventTypes.HOLD_RELEASED,
        payload: {
          listingId: listing.id,
          previousOrderId,
        },
        timestamp: new Date(),
      });
    }

    return expiredListings.length;
  }
}
