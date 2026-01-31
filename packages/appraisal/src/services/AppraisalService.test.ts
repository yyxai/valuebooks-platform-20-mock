import { describe, it, expect, vi } from 'vitest';
import { AppraisalService } from './AppraisalService.js';
import { MockBookLookupService } from '../infrastructure/BookLookupService.js';
import { Condition } from '../domain/AppraisedBook.js';
import { AppraisalStatus } from '../domain/Appraisal.js';
import { EventBus } from '@valuebooks/shared';

describe('AppraisalService', () => {
  it('creates appraisal for purchase request', async () => {
    const eventBus = new EventBus();
    const bookLookup = new MockBookLookupService();
    const service = new AppraisalService(eventBus, bookLookup);

    const appraisal = await service.create('pr-123');

    expect(appraisal.purchaseRequestId).toBe('pr-123');
    expect(appraisal.status).toBe(AppraisalStatus.Pending);
  });

  it('adds book by ISBN and condition', async () => {
    const eventBus = new EventBus();
    const bookLookup = new MockBookLookupService();
    const service = new AppraisalService(eventBus, bookLookup);

    const appraisal = await service.create('pr-123');
    const updated = await service.addBook(appraisal.id, '978-0-13-468599-1', Condition.Good);

    expect(updated.books).toHaveLength(1);
    expect(updated.books[0].title).toBe('Clean Code');
    expect(updated.books[0].offerPrice).toBe(6.00);
  });

  it('throws when adding unknown ISBN', async () => {
    const eventBus = new EventBus();
    const bookLookup = new MockBookLookupService();
    const service = new AppraisalService(eventBus, bookLookup);

    const appraisal = await service.create('pr-123');

    await expect(
      service.addBook(appraisal.id, 'unknown-isbn', Condition.Good)
    ).rejects.toThrow('Book not found');
  });

  it('emits AppraisalCompleted event on complete', async () => {
    const eventBus = new EventBus();
    const bookLookup = new MockBookLookupService();
    const service = new AppraisalService(eventBus, bookLookup);
    const handler = vi.fn();
    eventBus.subscribe('appraisal.completed', handler);

    const appraisal = await service.create('pr-123');
    await service.addBook(appraisal.id, '978-0-13-468599-1', Condition.Good);
    await service.complete(appraisal.id);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'appraisal.completed',
        payload: {
          appraisalId: appraisal.id,
          purchaseRequestId: 'pr-123',
          totalOffer: 6.00,
          bookCount: 1,
        },
      })
    );
  });
});
