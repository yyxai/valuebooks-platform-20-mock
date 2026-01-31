import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createAppraisalRoutes } from './routes.js';
import { AppraisalService } from '../services/AppraisalService.js';
import { MockBookLookupService } from '../infrastructure/BookLookupService.js';
import { EventBus } from '@valuebooks/shared';

describe('Appraisal API', () => {
  function createApp() {
    const eventBus = new EventBus();
    const bookLookup = new MockBookLookupService();
    const service = new AppraisalService(eventBus, bookLookup);
    const app = new Hono();
    app.route('/appraisals', createAppraisalRoutes(service));
    return app;
  }

  it('POST /appraisals creates new appraisal', async () => {
    const app = createApp();

    const res = await app.request('/appraisals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseRequestId: 'pr-123' }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.purchaseRequestId).toBe('pr-123');
    expect(data.status).toBe('pending');
  });

  it('POST /appraisals/:id/books adds book', async () => {
    const app = createApp();

    // Create appraisal first
    const createRes = await app.request('/appraisals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseRequestId: 'pr-123' }),
    });
    const { id } = await createRes.json();

    // Add book
    const res = await app.request(`/appraisals/${id}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isbn: '978-0-13-468599-1', condition: 'good' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.books).toHaveLength(1);
    expect(data.books[0].title).toBe('Clean Code');
  });
});
