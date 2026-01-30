// packages/purchase-intake/src/api/routes.ts
import { Hono } from 'hono';
import { PurchaseRequestService } from '../services/PurchaseRequestService.js';
import { BookCategory, BookCondition } from '../domain/BoxDescription.js';
import { PurchaseRequest } from '../domain/PurchaseRequest.js';

export function createPurchaseIntakeRoutes(service: PurchaseRequestService): Hono {
  const app = new Hono();

  // Create new purchase request
  app.post('/', async (c) => {
    const body = await c.req.json();
    const request = await service.create(body.customer, {
      quantity: body.box.quantity,
      category: body.box.category as BookCategory,
      condition: body.box.condition as BookCondition,
    });
    return c.json(formatResponse(request), 201);
  });

  // Get purchase request by ID
  app.get('/:id', async (c) => {
    const request = service.getRequest(c.req.param('id'));
    return c.json(formatResponse(request));
  });

  // Submit purchase request (get label)
  app.post('/:id/submit', async (c) => {
    const request = await service.submit(c.req.param('id'));
    return c.json(formatResponse(request));
  });

  // Accept or reject offer
  app.post('/:id/decision', async (c) => {
    const body = await c.req.json();
    const id = c.req.param('id');

    if (body.decision === 'accept') {
      const request = await service.acceptOffer(id, body.paymentMethod || 'ach');
      return c.json(formatResponse(request));
    } else {
      const request = await service.rejectOffer(id);
      return c.json(formatResponse(request));
    }
  });

  return app;
}

function formatResponse(request: PurchaseRequest) {
  return {
    id: request.id,
    status: request.status,
    customer: request.customer,
    boxDescription: request.boxDescription,
    estimate: request.estimate ? { low: request.estimate.low, high: request.estimate.high } : null,
    shipment: request.shipment || null,
    offer: request.offer || null,
    payment: request.payment || null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}
