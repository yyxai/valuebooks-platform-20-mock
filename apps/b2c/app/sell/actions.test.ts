import { describe, it, expect } from 'vitest';
import { createSubmission } from './actions';

describe('createSubmission', () => {
  it('should create a submission and return tracking info', async () => {
    const result = await createSubmission({
      boxCount: 2,
      pickupDate: '2026-02-03',
      pickupTimeSlot: '09:00-12:00',
      useSokufuri: false,
      name: 'テストユーザー',
      email: 'test@example.com',
      phone: '090-1234-5678',
      postalCode: '100-0001',
      prefecture: '東京都',
      city: '千代田区',
      street: '丸の内1-1-1',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBeDefined();
      expect(result.trackingNumber).toContain('MOCK');
      expect(result.labelUrl).toContain('http');
      expect(result.pickupDate).toBe('2026-02-03');
      expect(result.pickupTimeSlot).toBe('09:00-12:00');
      expect(result.useSokufuri).toBe(false);
    }
  });

  it('should reject invalid box count', async () => {
    const result = await createSubmission({
      boxCount: 0,
      pickupDate: '2026-02-03',
      pickupTimeSlot: '09:00-12:00',
      useSokufuri: false,
      name: 'テストユーザー',
      email: 'test@example.com',
      phone: '090-1234-5678',
      postalCode: '100-0001',
      prefecture: '東京都',
      city: '千代田区',
      street: '丸の内1-1-1',
    });

    expect(result.success).toBe(false);
  });

  it('should handle sokufuri option', async () => {
    const result = await createSubmission({
      boxCount: 1,
      pickupDate: '2026-02-03',
      pickupTimeSlot: '15:00-18:00',
      useSokufuri: true,
      couponCode: 'TEST123',
      name: 'テストユーザー',
      email: 'test@example.com',
      phone: '090-1234-5678',
      postalCode: '100-0001',
      prefecture: '東京都',
      city: '千代田区',
      street: '丸の内1-1-1',
      building: 'テストビル101',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.useSokufuri).toBe(true);
    }
  });
});
