// packages/purchase-intake/src/infrastructure/CarrierAdapter.ts
export interface ShippingLabel {
  trackingNumber: string;
  labelUrl: string;
  carrier: string;
}

export interface TrackingEvent {
  status: 'label_created' | 'in_transit' | 'out_for_delivery' | 'delivered';
  timestamp: Date;
  location?: string;
}

export interface CarrierAdapter {
  generateLabel(address: {
    postalCode: string;
    prefecture: string;
    city: string;
    street: string;
    building?: string;
  }): Promise<ShippingLabel>;

  getTrackingStatus(trackingNumber: string): Promise<TrackingEvent[]>;

  scheduleReturn(trackingNumber: string): Promise<ShippingLabel>;
}
