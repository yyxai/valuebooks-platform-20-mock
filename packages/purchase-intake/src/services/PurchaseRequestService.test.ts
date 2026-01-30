// packages/purchase-intake/src/services/PurchaseRequestService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { PurchaseRequestService } from './PurchaseRequestService.js';
import { EstimationService } from './EstimationService.js';
import { MockCarrierAdapter } from '../infrastructure/MockCarrierAdapter.js';
import { EventBus } from '@valuebooks/shared';
import { BookCategory, BookCondition } from '../domain/BoxDescription.js';
import { PurchaseIntakeEventTypes } from '../domain/events/index.js';

describe('PurchaseRequestService', () => {
  const eventBus = new EventBus();
  const estimationService = new EstimationService();
  const carrierAdapter = new MockCarrierAdapter();
  const service = new PurchaseRequestService(eventBus, estimationService, carrierAdapter);

  const customerData = {
    email: 'test@example.com',
    name: 'Test User',
    address: { street: '123 Main St', city: 'Boston', state: 'MA', zip: '02101' },
  };

  it('should create a draft purchase request', async () => {
    const request = await service.create(customerData, {
      quantity: 20,
      category: BookCategory.Fiction,
      condition: BookCondition.Good,
    });

    expect(request.id).toBeDefined();
    expect(request.status).toBe('draft');
  });

  it('should submit and emit event', async () => {
    const handler = vi.fn();
    eventBus.subscribe(PurchaseIntakeEventTypes.SUBMITTED, handler);

    const request = await service.create(customerData, {
      quantity: 20,
      category: BookCategory.Fiction,
      condition: BookCondition.Good,
    });
    await service.submit(request.id);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: PurchaseIntakeEventTypes.SUBMITTED })
    );
  });
});
