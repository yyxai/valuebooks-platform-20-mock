export interface CreateShipmentTrackingProps {
  carrier: string;
  trackingNumber: string;
}

export interface ReconstructShipmentTrackingProps extends CreateShipmentTrackingProps {
  shippedAt?: Date;
  deliveredAt?: Date;
}

export class ShipmentTracking {
  readonly carrier: string;
  readonly trackingNumber: string;
  readonly shippedAt?: Date;
  readonly deliveredAt?: Date;

  private constructor(
    carrier: string,
    trackingNumber: string,
    shippedAt?: Date,
    deliveredAt?: Date
  ) {
    this.carrier = carrier;
    this.trackingNumber = trackingNumber;
    this.shippedAt = shippedAt;
    this.deliveredAt = deliveredAt;
  }

  static create(props: CreateShipmentTrackingProps): ShipmentTracking {
    if (!props.carrier?.trim()) {
      throw new Error('Carrier is required');
    }
    if (!props.trackingNumber?.trim()) {
      throw new Error('Tracking number is required');
    }

    return new ShipmentTracking(
      props.carrier.trim(),
      props.trackingNumber.trim(),
      new Date()
    );
  }

  static reconstruct(props: ReconstructShipmentTrackingProps): ShipmentTracking {
    return new ShipmentTracking(
      props.carrier,
      props.trackingNumber,
      props.shippedAt,
      props.deliveredAt
    );
  }

  markDelivered(): ShipmentTracking {
    if (!this.shippedAt) {
      throw new Error('Cannot mark as delivered: not shipped');
    }
    if (this.deliveredAt) {
      throw new Error('Already delivered');
    }
    return new ShipmentTracking(
      this.carrier,
      this.trackingNumber,
      this.shippedAt,
      new Date()
    );
  }

  toJSON() {
    return {
      carrier: this.carrier,
      trackingNumber: this.trackingNumber,
      shippedAt: this.shippedAt,
      deliveredAt: this.deliveredAt,
    };
  }
}
