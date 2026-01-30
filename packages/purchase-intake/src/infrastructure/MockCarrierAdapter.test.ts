// packages/purchase-intake/src/infrastructure/MockCarrierAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { MockCarrierAdapter } from './MockCarrierAdapter.js';

describe('MockCarrierAdapter', () => {
  const adapter = new MockCarrierAdapter();

  it('should generate a shipping label', async () => {
    const address = { street: '123 Main St', city: 'Boston', state: 'MA', zip: '02101' };
    const label = await adapter.generateLabel(address);

    expect(label.trackingNumber).toBeDefined();
    expect(label.labelUrl).toContain('http');
    expect(label.carrier).toBe('mock');
  });

  it('should return tracking events', async () => {
    const events = await adapter.getTrackingStatus('MOCK123');

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].status).toBe('label_created');
  });
});
