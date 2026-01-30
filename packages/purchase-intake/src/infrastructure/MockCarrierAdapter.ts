// packages/purchase-intake/src/infrastructure/MockCarrierAdapter.ts
import { CarrierAdapter, ShippingLabel, TrackingEvent } from './CarrierAdapter.js';

export class MockCarrierAdapter implements CarrierAdapter {
  async generateLabel(address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  }): Promise<ShippingLabel> {
    const trackingNumber = `MOCK${Date.now()}`;
    return {
      trackingNumber,
      labelUrl: `https://mock-carrier.example.com/labels/${trackingNumber}.pdf`,
      carrier: 'mock',
    };
  }

  async getTrackingStatus(trackingNumber: string): Promise<TrackingEvent[]> {
    return [
      { status: 'label_created', timestamp: new Date() },
    ];
  }

  async scheduleReturn(trackingNumber: string): Promise<ShippingLabel> {
    const returnTrackingNumber = `RET${trackingNumber}`;
    return {
      trackingNumber: returnTrackingNumber,
      labelUrl: `https://mock-carrier.example.com/labels/${returnTrackingNumber}.pdf`,
      carrier: 'mock',
    };
  }
}
