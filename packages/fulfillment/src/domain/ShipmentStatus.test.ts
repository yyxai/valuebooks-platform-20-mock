import { describe, it, expect } from 'vitest';
import { ShipmentStatus } from './ShipmentStatus.js';

describe('ShipmentStatus', () => {
  it('should have all expected statuses', () => {
    expect(ShipmentStatus.Pending).toBe('pending');
    expect(ShipmentStatus.Picking).toBe('picking');
    expect(ShipmentStatus.Packed).toBe('packed');
    expect(ShipmentStatus.Dispatched).toBe('dispatched');
    expect(ShipmentStatus.InTransit).toBe('in_transit');
    expect(ShipmentStatus.Delivered).toBe('delivered');
  });
});
