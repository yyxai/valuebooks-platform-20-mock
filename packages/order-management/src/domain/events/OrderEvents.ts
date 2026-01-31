import type { DomainEvent } from '@valuebooks/shared';
import type { BookCondition } from '../BookCondition.js';
import type { PaymentMethod } from '../Payment.js';

export interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
}

export interface OrderCheckoutStartedPayload {
  orderId: string;
  listingIds: string[];
}

export interface OrderPaymentProcessedPayload {
  orderId: string;
  amount: number;
  method: PaymentMethod;
}

export interface OrderLineItemSnapshot {
  listingId: string;
  isbn: string;
  title: string;
  author: string;
  condition: BookCondition;
  price: number;
}

export interface OrderConfirmedPayload {
  orderId: string;
  customerId: string;
  lineItems: OrderLineItemSnapshot[];
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

export interface OrderShippedPayload {
  orderId: string;
  trackingNumber: string;
  carrier: string;
}

export interface OrderDeliveredPayload {
  orderId: string;
  deliveredAt: Date;
}

export interface OrderCancelledPayload {
  orderId: string;
  reason?: string;
}

export type OrderCreated = DomainEvent<OrderCreatedPayload>;
export type OrderCheckoutStarted = DomainEvent<OrderCheckoutStartedPayload>;
export type OrderPaymentProcessed = DomainEvent<OrderPaymentProcessedPayload>;
export type OrderConfirmed = DomainEvent<OrderConfirmedPayload>;
export type OrderShipped = DomainEvent<OrderShippedPayload>;
export type OrderDelivered = DomainEvent<OrderDeliveredPayload>;
export type OrderCancelled = DomainEvent<OrderCancelledPayload>;

export const OrderEventTypes = {
  CREATED: 'OrderCreated',
  CHECKOUT_STARTED: 'OrderCheckoutStarted',
  PAYMENT_PROCESSED: 'OrderPaymentProcessed',
  CONFIRMED: 'OrderConfirmed',
  SHIPPED: 'OrderShipped',
  DELIVERED: 'OrderDelivered',
  CANCELLED: 'OrderCancelled',
} as const;
