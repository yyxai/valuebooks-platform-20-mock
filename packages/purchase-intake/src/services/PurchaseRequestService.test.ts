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
    name: 'テストユーザー',
    phone: '090-1234-5678',
    address: {
      postalCode: '100-0001',
      prefecture: '東京都',
      city: '千代田区',
      street: '丸の内1-1-1',
    },
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
