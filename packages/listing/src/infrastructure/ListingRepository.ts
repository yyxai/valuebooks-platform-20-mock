import { Listing } from '../domain/Listing.js';
import { SearchCriteria, SearchResult } from '../domain/SearchCriteria.js';

export interface ListingRepository {
  save(listing: Listing): Promise<void>;
  findById(id: string): Promise<Listing | null>;
  findByIsbn(isbn: string): Promise<Listing | null>;
  search(criteria: SearchCriteria): Promise<SearchResult<Listing>>;
  findExpiredHolds(): Promise<Listing[]>;
  findAll(): Promise<Listing[]>;
}
