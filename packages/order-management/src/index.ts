// @valuebooks/order-management - Order Management Domain

// Domain exports
export { Order } from './domain/Order.js';
export type { CreateOrderProps, ReconstructOrderProps, ProcessPaymentInput } from './domain/Order.js';
export { OrderStatus } from './domain/OrderStatus.js';
export { OrderLineItem, LineItemStatus } from './domain/OrderLineItem.js';
export type { CreateLineItemProps, ReconstructLineItemProps } from './domain/OrderLineItem.js';
export { Address } from './domain/Address.js';
export type { AddressProps } from './domain/Address.js';
export { Money } from './domain/Money.js';
export { BookCondition } from './domain/BookCondition.js';
export { Payment, PaymentMethod, PaymentStatus } from './domain/Payment.js';
export type { CreatePaymentProps, ReconstructPaymentProps } from './domain/Payment.js';
export { ShipmentTracking } from './domain/ShipmentTracking.js';
export type { CreateShipmentTrackingProps, ReconstructShipmentTrackingProps } from './domain/ShipmentTracking.js';

// Events
export type {
  OrderCreatedPayload,
  OrderCheckoutStartedPayload,
  OrderPaymentProcessedPayload,
  OrderLineItemSnapshot,
  OrderConfirmedPayload,
  OrderShippedPayload,
  OrderDeliveredPayload,
  OrderCancelledPayload,
  OrderCreated,
  OrderCheckoutStarted,
  OrderPaymentProcessed,
  OrderConfirmed,
  OrderShipped,
  OrderDelivered,
  OrderCancelled,
} from './domain/events/index.js';
export { OrderEventTypes } from './domain/events/index.js';

// Services
export { OrderService } from './services/OrderService.js';
export type { PaymentInfo, ShippingInfo } from './services/OrderService.js';

// Infrastructure
export type { OrderRepository } from './infrastructure/OrderRepository.js';
export { InMemoryOrderRepository } from './infrastructure/InMemoryOrderRepository.js';
export type { ListingClient, ListingData } from './infrastructure/ListingClient.js';
export { HttpListingClient, InMemoryListingClient } from './infrastructure/ListingClient.js';

// API
export { createOrderRoutes } from './api/routes.js';
