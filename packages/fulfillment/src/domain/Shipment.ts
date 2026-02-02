import { ShipmentStatus } from './ShipmentStatus.js';
import { Carrier } from './Carrier.js';
import { TrackingUrlGenerator } from './TrackingUrlGenerator.js';
import type { Address } from './Address.js';

export interface CreateShipmentProps {
  orderId: string;
  shippingAddress: Address;
}

export interface ReconstructShipmentProps {
  id: string;
  orderId: string;
  shippingAddress: Address;
  status: ShipmentStatus;
  carrier?: Carrier;
  trackingNumber?: string;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Shipment {
  readonly id: string;
  readonly orderId: string;
  readonly shippingAddress: Address;
  readonly status: ShipmentStatus;
  readonly carrier?: Carrier;
  readonly trackingNumber?: string;
  readonly deliveredAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: {
    id: string;
    orderId: string;
    shippingAddress: Address;
    status: ShipmentStatus;
    carrier?: Carrier;
    trackingNumber?: string;
    deliveredAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.orderId = props.orderId;
    this.shippingAddress = props.shippingAddress;
    this.status = props.status;
    this.carrier = props.carrier;
    this.trackingNumber = props.trackingNumber;
    this.deliveredAt = props.deliveredAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreateShipmentProps): Shipment {
    const now = new Date();
    return new Shipment({
      id: crypto.randomUUID(),
      orderId: props.orderId,
      shippingAddress: props.shippingAddress,
      status: ShipmentStatus.Pending,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: ReconstructShipmentProps): Shipment {
    return new Shipment(props);
  }

  get trackingUrl(): string | undefined {
    if (!this.carrier || !this.trackingNumber) {
      return undefined;
    }
    return TrackingUrlGenerator.generate(this.carrier, this.trackingNumber);
  }

  startPicking(): Shipment {
    if (this.status !== ShipmentStatus.Pending) {
      throw new Error('Can only start picking from Pending status');
    }
    return new Shipment({
      ...this.toProps(),
      status: ShipmentStatus.Picking,
      updatedAt: new Date(),
    });
  }

  markPacked(): Shipment {
    if (this.status !== ShipmentStatus.Picking) {
      throw new Error('Can only mark packed from Picking status');
    }
    return new Shipment({
      ...this.toProps(),
      status: ShipmentStatus.Packed,
      updatedAt: new Date(),
    });
  }

  dispatch(carrier: Carrier, trackingNumber: string): Shipment {
    if (this.status !== ShipmentStatus.Packed) {
      throw new Error('Can only dispatch from Packed status');
    }
    if (!trackingNumber?.trim()) {
      throw new Error('Tracking number is required');
    }
    return new Shipment({
      ...this.toProps(),
      status: ShipmentStatus.Dispatched,
      carrier,
      trackingNumber: trackingNumber.trim(),
      updatedAt: new Date(),
    });
  }

  updateInTransit(): Shipment {
    if (this.status !== ShipmentStatus.Dispatched) {
      throw new Error('Can only update to in-transit from Dispatched status');
    }
    return new Shipment({
      ...this.toProps(),
      status: ShipmentStatus.InTransit,
      updatedAt: new Date(),
    });
  }

  markDelivered(): Shipment {
    if (this.status !== ShipmentStatus.InTransit) {
      throw new Error('Can only mark delivered from InTransit status');
    }
    const now = new Date();
    return new Shipment({
      ...this.toProps(),
      status: ShipmentStatus.Delivered,
      deliveredAt: now,
      updatedAt: now,
    });
  }

  private toProps() {
    return {
      id: this.id,
      orderId: this.orderId,
      shippingAddress: this.shippingAddress,
      status: this.status,
      carrier: this.carrier,
      trackingNumber: this.trackingNumber,
      deliveredAt: this.deliveredAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
