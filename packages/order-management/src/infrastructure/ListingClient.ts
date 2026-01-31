export interface ListingData {
  id: string;
  isbn: string;
  title: string;
  author: string;
  condition: string;
  listingPrice: number;
  status: string;
}

export interface ListingClient {
  getById(listingId: string): Promise<ListingData | null>;
  holdForOrder(listingId: string, orderId: string): Promise<void>;
  releaseHold(listingId: string): Promise<void>;
  markSold(listingId: string): Promise<void>;
}

export class HttpListingClient implements ListingClient {
  constructor(private baseUrl: string) {}

  async getById(listingId: string): Promise<ListingData | null> {
    const response = await fetch(`${this.baseUrl}/listings/${listingId}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to get listing: ${response.statusText}`);
    }
    const data = await response.json();
    return {
      id: data.id,
      isbn: data.bookInfo.isbn,
      title: data.bookInfo.title,
      author: data.bookInfo.author,
      condition: data.bookInfo.condition,
      listingPrice: Math.round(data.listingPrice * 100), // Convert to cents
      status: data.status,
    };
  }

  async holdForOrder(listingId: string, orderId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/listings/${listingId}/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Failed to hold listing');
    }
  }

  async releaseHold(listingId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/listings/${listingId}/release`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Failed to release listing hold');
    }
  }

  async markSold(listingId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/listings/${listingId}/sold`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Failed to mark listing as sold');
    }
  }
}

export class InMemoryListingClient implements ListingClient {
  private listings = new Map<string, ListingData>();
  private heldListings = new Map<string, string>(); // listingId -> orderId
  private soldListings = new Set<string>();

  addListing(listing: ListingData): void {
    this.listings.set(listing.id, listing);
  }

  async getById(listingId: string): Promise<ListingData | null> {
    return this.listings.get(listingId) ?? null;
  }

  async holdForOrder(listingId: string, orderId: string): Promise<void> {
    const listing = this.listings.get(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }
    if (this.soldListings.has(listingId)) {
      throw new Error('Listing is already sold');
    }
    if (this.heldListings.has(listingId)) {
      throw new Error('Listing is already held');
    }
    this.heldListings.set(listingId, orderId);
  }

  async releaseHold(listingId: string): Promise<void> {
    if (!this.heldListings.has(listingId)) {
      throw new Error('Listing is not held');
    }
    this.heldListings.delete(listingId);
  }

  async markSold(listingId: string): Promise<void> {
    if (!this.heldListings.has(listingId)) {
      throw new Error('Listing must be held before marking as sold');
    }
    this.heldListings.delete(listingId);
    this.soldListings.add(listingId);
  }

  isHeld(listingId: string): boolean {
    return this.heldListings.has(listingId);
  }

  isSold(listingId: string): boolean {
    return this.soldListings.has(listingId);
  }
}
