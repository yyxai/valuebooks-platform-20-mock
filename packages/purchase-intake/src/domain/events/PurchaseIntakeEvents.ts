import { DomainEvent } from '@valuebooks/shared';

export interface PurchaseRequestSubmittedPayload {
  requestId: string;
  customerId: string;
  trackingNumber: string;
}

export interface PurchaseRequestReceivedPayload {
  requestId: string;
  trackingNumber: string;
}

export interface PurchaseRequestAcceptedPayload {
  requestId: string;
  amount: number;
  paymentMethod: 'ach' | 'store_credit';
}

export interface PurchaseRequestRejectedPayload {
  requestId: string;
  trackingNumber: string;
}

export type PurchaseRequestSubmitted = DomainEvent<PurchaseRequestSubmittedPayload>;
export type PurchaseRequestReceived = DomainEvent<PurchaseRequestReceivedPayload>;
export type PurchaseRequestAccepted = DomainEvent<PurchaseRequestAcceptedPayload>;
export type PurchaseRequestRejected = DomainEvent<PurchaseRequestRejectedPayload>;

export const PurchaseIntakeEventTypes = {
  SUBMITTED: 'PurchaseRequestSubmitted',
  RECEIVED: 'PurchaseRequestReceived',
  ACCEPTED: 'PurchaseRequestAccepted',
  REJECTED: 'PurchaseRequestRejected',
} as const;
