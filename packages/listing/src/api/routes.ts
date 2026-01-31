import { Hono } from 'hono';
import { ListingService } from '../services/ListingService.js';
import { Listing } from '../domain/Listing.js';
import { BookCondition } from '../domain/BookCondition.js';
import { SortOption } from '../domain/SearchCriteria.js';

export function createListingRoutes(service: ListingService): Hono {
  const app = new Hono();

  // Browse/search listings
  app.get('/', async (c) => {
    const query = c.req.query();

    const conditions = query.conditions
      ? (query.conditions.split(',') as BookCondition[])
      : undefined;

    const result = await service.search({
      q: query.q,
      conditions,
      minPrice: query.minPrice ? parseFloat(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? parseFloat(query.maxPrice) : undefined,
      sort: query.sort as SortOption,
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
    });

    return c.json({
      items: result.items.map(formatListing),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  });

  // Get listing by ISBN (must be before /:id to not conflict)
  app.get('/isbn/:isbn', async (c) => {
    const listing = await service.getByIsbn(c.req.param('isbn'));
    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404);
    }
    return c.json(formatListing(listing));
  });

  // Get listing by ID
  app.get('/:id', async (c) => {
    const listing = await service.getById(c.req.param('id'));
    if (!listing) {
      return c.json({ error: 'Listing not found' }, 404);
    }
    return c.json(formatListing(listing));
  });

  // Hold listing for checkout
  app.post('/:id/hold', async (c) => {
    try {
      const body = await c.req.json();
      const listing = await service.holdForOrder(c.req.param('id'), body.orderId);
      return c.json(formatListing(listing));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Listing not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Release hold
  app.post('/:id/release', async (c) => {
    try {
      const listing = await service.releaseHold(c.req.param('id'));
      return c.json(formatListing(listing));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Listing not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Mark as sold
  app.post('/:id/sold', async (c) => {
    try {
      const listing = await service.markSold(c.req.param('id'));
      return c.json(formatListing(listing));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Listing not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Withdraw from sale
  app.post('/:id/withdraw', async (c) => {
    try {
      let reason: string | undefined;
      try {
        const body = await c.req.json();
        reason = body.reason;
      } catch {
        // No body provided, which is fine
      }
      const listing = await service.withdraw(c.req.param('id'), reason);
      return c.json(formatListing(listing));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Listing not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  return app;
}

function formatListing(listing: Listing) {
  return {
    id: listing.id,
    bookInfo: {
      isbn: listing.bookInfo.isbn,
      title: listing.bookInfo.title,
      author: listing.bookInfo.author,
      condition: listing.bookInfo.condition,
      coverImageUrl: listing.bookInfo.coverImageUrl,
      publisher: listing.bookInfo.publisher,
      publishYear: listing.bookInfo.publishYear,
      description: listing.bookInfo.description,
    },
    sourceAppraisalId: listing.sourceAppraisalId,
    purchaseRequestId: listing.purchaseRequestId,
    status: listing.status,
    offerPrice: listing.offerPrice.toDollars(),
    listingPrice: listing.listingPrice.toDollars(),
    heldByOrderId: listing.heldByOrderId,
    heldUntil: listing.heldUntil,
    soldAt: listing.soldAt,
    withdrawReason: listing.withdrawReason,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}
