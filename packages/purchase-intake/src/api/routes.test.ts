// packages/purchase-intake/src/api/routes.test.ts
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createPurchaseIntakeRoutes } from './routes.js';
import { PurchaseRequestService } from '../services/PurchaseRequestService.js';
import { EstimationService } from '../services/EstimationService.js';
import { MockCarrierAdapter } from '../infrastructure/MockCarrierAdapter.js';
import { EventBus } from '@valuebooks/shared';

describe('Purchase Intake API', () => {
  const eventBus = new EventBus();
  const service = new PurchaseRequestService(
    eventBus,
    new EstimationService(),
    new MockCarrierAdapter()
  );
  const app = new Hono().route('/purchase-requests', createPurchaseIntakeRoutes(service));

  it('POST /purchase-requests should create a draft request', async () => {
    const res = await app.request('/purchase-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          email: 'test@example.com',
          name: 'Test User',
          address: { street: '123 Main St', city: 'Boston', state: 'MA', zip: '02101' },
        },
        box: { quantity: 20, category: 'fiction', condition: 'good' },
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.status).toBe('draft');
  });

  it('POST /purchase-requests/:id/submit should submit and return label', async () => {
    // Create first
    const createRes = await app.request('/purchase-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          email: 'test@example.com',
          name: 'Test User',
          address: { street: '123 Main St', city: 'Boston', state: 'MA', zip: '02101' },
        },
        box: { quantity: 20, category: 'fiction', condition: 'good' },
      }),
    });
    const created = await createRes.json();

    // Submit
    const submitRes = await app.request(`/purchase-requests/${created.id}/submit`, {
      method: 'POST',
    });

    expect(submitRes.status).toBe(200);
    const data = await submitRes.json();
    expect(data.status).toBe('submitted');
    expect(data.shipment.trackingNumber).toBeDefined();
    expect(data.estimate).toBeDefined();
  });
});
