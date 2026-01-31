import { DomainEvent } from '@valuebooks/shared';
import { BookCondition } from '../BookCondition.js';

export interface ListingCreatedPayload {
  listingId: string;
  isbn: string;
  title: string;
  author: string;
  condition: BookCondition;
  listingPrice: number;
  sourceAppraisalId: string;
}

export interface ListingHeldPayload {
  listingId: string;
  orderId: string;
  heldUntil: Date;
}

export interface ListingHoldReleasedPayload {
  listingId: string;
  previousOrderId: string;
}

export interface ListingSoldPayload {
  listingId: string;
  orderId: string;
  soldAt: Date;
  salePrice: number;
}

export interface ListingWithdrawnPayload {
  listingId: string;
  reason?: string;
}

export type ListingCreated = DomainEvent<ListingCreatedPayload>;
export type ListingHeld = DomainEvent<ListingHeldPayload>;
export type ListingHoldReleased = DomainEvent<ListingHoldReleasedPayload>;
export type ListingSold = DomainEvent<ListingSoldPayload>;
export type ListingWithdrawn = DomainEvent<ListingWithdrawnPayload>;

export const ListingEventTypes = {
  CREATED: 'ListingCreated',
  HELD: 'ListingHeld',
  HOLD_RELEASED: 'ListingHoldReleased',
  SOLD: 'ListingSold',
  WITHDRAWN: 'ListingWithdrawn',
} as const;
