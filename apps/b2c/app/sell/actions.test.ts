import { describe, it, expect } from 'vitest';
import { createSubmission } from './actions';

describe('createSubmission', () => {
  it('should create a submission and return tracking info', async () => {
    const result = await createSubmission({
      boxCount: 2,
      email: 'test@example.com',
      name: 'Test User',
      street: '123 Main St',
      city: 'Boston',
      state: 'MA',
      zip: '02101',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBeDefined();
      expect(result.trackingNumber).toContain('MOCK');
      expect(result.labelUrl).toContain('http');
    }
  });

  it('should reject invalid box count', async () => {
    const result = await createSubmission({
      boxCount: 0,
      email: 'test@example.com',
      name: 'Test User',
      street: '123 Main St',
      city: 'Boston',
      state: 'MA',
      zip: '02101',
    });

    expect(result.success).toBe(false);
  });
});
