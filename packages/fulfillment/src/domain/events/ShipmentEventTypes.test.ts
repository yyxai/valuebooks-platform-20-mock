import { describe, it, expect } from 'vitest';
import { ShipmentEventTypes } from './ShipmentEventTypes.js';

describe('ShipmentEventTypes', () => {
  it('should have all expected event types', () => {
    expect(ShipmentEventTypes.CREATED).toBe('ShipmentCreated');
    expect(ShipmentEventTypes.PICKING).toBe('ShipmentPicking');
    expect(ShipmentEventTypes.PACKED).toBe('ShipmentPacked');
    expect(ShipmentEventTypes.DISPATCHED).toBe('ShipmentDispatched');
    expect(ShipmentEventTypes.IN_TRANSIT).toBe('ShipmentInTransit');
    expect(ShipmentEventTypes.DELIVERED).toBe('ShipmentDelivered');
  });
});
