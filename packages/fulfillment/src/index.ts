// @valuebooks/fulfillment - Fulfillment Domain

// Domain exports
export { Shipment } from './domain/Shipment.js';
export type { CreateShipmentProps, ReconstructShipmentProps } from './domain/Shipment.js';
export { ShipmentStatus } from './domain/ShipmentStatus.js';
export { Carrier } from './domain/Carrier.js';
export { TrackingUrlGenerator } from './domain/TrackingUrlGenerator.js';
export { Address } from './domain/Address.js';
export type { AddressProps } from './domain/Address.js';

// Events
export type {
  ShipmentCreatedPayload,
  ShipmentStatusChangedPayload,
  ShipmentDispatchedPayload,
  ShipmentDeliveredPayload,
  ShipmentCreated,
  ShipmentPicking,
  ShipmentPacked,
  ShipmentDispatched,
  ShipmentInTransit,
  ShipmentDelivered,
} from './domain/events/index.js';
export { ShipmentEventTypes } from './domain/events/index.js';

// Services
export { FulfillmentService } from './services/FulfillmentService.js';

// Infrastructure
export type { ShipmentRepository } from './infrastructure/ShipmentRepository.js';
export { InMemoryShipmentRepository } from './infrastructure/InMemoryShipmentRepository.js';

// API
export { createFulfillmentRoutes } from './api/routes.js';
