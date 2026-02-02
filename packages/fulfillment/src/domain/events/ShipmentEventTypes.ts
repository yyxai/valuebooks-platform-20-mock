import type { DomainEvent } from '@valuebooks/shared';
import type { ShipmentStatus } from '../ShipmentStatus.js';
import type { Carrier } from '../Carrier.js';

export interface ShipmentCreatedPayload {
  shipmentId: string;
  orderId: string;
  shippingAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface ShipmentStatusChangedPayload {
  shipmentId: string;
  orderId: string;
  status: ShipmentStatus;
}

export interface ShipmentDispatchedPayload {
  shipmentId: string;
  orderId: string;
  carrier: Carrier;
  trackingNumber: string;
  trackingUrl: string;
}

export interface ShipmentDeliveredPayload {
  shipmentId: string;
  orderId: string;
  deliveredAt: Date;
}

export type ShipmentCreated = DomainEvent<ShipmentCreatedPayload>;
export type ShipmentPicking = DomainEvent<ShipmentStatusChangedPayload>;
export type ShipmentPacked = DomainEvent<ShipmentStatusChangedPayload>;
export type ShipmentDispatched = DomainEvent<ShipmentDispatchedPayload>;
export type ShipmentInTransit = DomainEvent<ShipmentStatusChangedPayload>;
export type ShipmentDelivered = DomainEvent<ShipmentDeliveredPayload>;

export const ShipmentEventTypes = {
  CREATED: 'ShipmentCreated',
  PICKING: 'ShipmentPicking',
  PACKED: 'ShipmentPacked',
  DISPATCHED: 'ShipmentDispatched',
  IN_TRANSIT: 'ShipmentInTransit',
  DELIVERED: 'ShipmentDelivered',
} as const;
