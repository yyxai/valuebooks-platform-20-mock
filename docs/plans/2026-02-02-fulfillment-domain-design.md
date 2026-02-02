# Fulfillment Domain Design

## Overview

The fulfillment domain manages the shipment lifecycle for confirmed orders. It owns the warehouse workflow from order confirmation through delivery, operating as an independent bounded context that communicates with other domains via events.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Shipment model | Separate entity | Decouples fulfillment operations from order status; follows DDD principles |
| Lifecycle stages | Warehouse workflow | Pending → Picking → Packed → Dispatched → InTransit → Delivered |
| Order relationship | One-to-one | Simpler model; can evolve to one-to-many later if needed |
| Tracking info | Basic with computed URL | carrier + trackingNumber; URL generated from carrier patterns |
| Carriers | Japan domestic | Yamato, Sagawa, Japan Post |
| Trigger mechanism | Event-driven | Subscribe to OrderConfirmed; follows codebase patterns |
| Event scope | Full lifecycle | All state transitions published for maximum flexibility |

## Domain Model

### Shipment Entity

```typescript
class Shipment {
  readonly id: string;
  readonly orderId: string;
  readonly shippingAddress: Address;
  status: ShipmentStatus;
  carrier?: Carrier;
  trackingNumber?: string;
  readonly createdAt: Date;
  updatedAt: Date;

  // Computed
  get trackingUrl(): string | undefined;

  // State transitions
  startPicking(): Shipment;
  markPacked(): Shipment;
  dispatch(carrier: Carrier, trackingNumber: string): Shipment;
  updateInTransit(): Shipment;
  markDelivered(): Shipment;
}
```

### ShipmentStatus Enum

```typescript
enum ShipmentStatus {
  Pending = 'pending',
  Picking = 'picking',
  Packed = 'packed',
  Dispatched = 'dispatched',
  InTransit = 'in_transit',
  Delivered = 'delivered',
}
```

### Carrier Enum

```typescript
enum Carrier {
  Yamato = 'yamato',
  Sagawa = 'sagawa',
  JapanPost = 'japan_post',
}
```

### TrackingUrlGenerator

Generates tracking URLs based on carrier:

| Carrier | URL Pattern |
|---------|-------------|
| Yamato | `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number={trackingNumber}` |
| Sagawa | `https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo={trackingNumber}` |
| Japan Post | `https://trackings.post.japanpost.jp/services/srv/search?requestNo1={trackingNumber}` |

## Service Layer

### FulfillmentService

```typescript
class FulfillmentService {
  constructor(
    private repository: ShipmentRepository,
    private eventBus: EventBus
  )

  // Creation (triggered by OrderConfirmed event)
  async createShipment(orderId: string, shippingAddress: Address): Promise<Shipment>;

  // Warehouse workflow
  async startPicking(shipmentId: string): Promise<Shipment>;
  async markPacked(shipmentId: string): Promise<Shipment>;
  async dispatch(shipmentId: string, carrier: Carrier, trackingNumber: string): Promise<Shipment>;
  async updateInTransit(shipmentId: string): Promise<Shipment>;
  async markDelivered(shipmentId: string): Promise<Shipment>;

  // Queries
  async getByOrderId(orderId: string): Promise<Shipment | null>;
  async getShipmentsByStatus(status: ShipmentStatus): Promise<Shipment[]>;
  async getAllShipments(): Promise<Shipment[]>;
}
```

## Repository

### ShipmentRepository Interface

```typescript
interface ShipmentRepository {
  save(shipment: Shipment): Promise<void>;
  findById(id: string): Promise<Shipment | null>;
  findByOrderId(orderId: string): Promise<Shipment | null>;
  findByStatus(status: ShipmentStatus): Promise<Shipment[]>;
  findAll(): Promise<Shipment[]>;
}
```

### InMemoryShipmentRepository

Reference implementation using `Map<string, Shipment>` for testing and development.

## Events

### Event Types

```typescript
const ShipmentEventTypes = {
  CREATED: 'ShipmentCreated',
  PICKING: 'ShipmentPicking',
  PACKED: 'ShipmentPacked',
  DISPATCHED: 'ShipmentDispatched',
  IN_TRANSIT: 'ShipmentInTransit',
  DELIVERED: 'ShipmentDelivered',
} as const;
```

### Event Payloads

```typescript
interface ShipmentCreatedPayload {
  shipmentId: string;
  orderId: string;
  shippingAddress: AddressJSON;
}

interface ShipmentStatusChangedPayload {
  shipmentId: string;
  orderId: string;
  status: ShipmentStatus;
}

interface ShipmentDispatchedPayload {
  shipmentId: string;
  orderId: string;
  carrier: Carrier;
  trackingNumber: string;
  trackingUrl: string;
}

interface ShipmentDeliveredPayload {
  shipmentId: string;
  orderId: string;
  deliveredAt: Date;
}
```

### Event Subscription

Fulfillment subscribes to `OrderConfirmed`:

```typescript
eventBus.subscribe(OrderEventTypes.CONFIRMED, async (event) => {
  await fulfillmentService.createShipment(
    event.payload.orderId,
    Address.create(event.payload.shippingAddress)
  );
});
```

## API Routes

Endpoints for B2E (Employee) app:

| Method | Path | Description |
|--------|------|-------------|
| GET | /shipments | List shipments (optional status filter) |
| GET | /shipments/:id | Get shipment by ID |
| GET | /shipments/order/:orderId | Get shipment by order ID |
| POST | /shipments/:id/picking | Start picking |
| POST | /shipments/:id/packed | Mark as packed |
| POST | /shipments/:id/dispatch | Dispatch with carrier & tracking |
| POST | /shipments/:id/in-transit | Update to in-transit |
| POST | /shipments/:id/delivered | Mark as delivered |

## File Structure

```
packages/fulfillment/
├── src/
│   ├── domain/
│   │   ├── Shipment.ts
│   │   ├── ShipmentStatus.ts
│   │   ├── Carrier.ts
│   │   ├── TrackingUrlGenerator.ts
│   │   └── events/
│   │       ├── ShipmentEventTypes.ts
│   │       └── index.ts
│   ├── services/
│   │   ├── FulfillmentService.ts
│   │   └── FulfillmentService.test.ts
│   ├── infrastructure/
│   │   ├── ShipmentRepository.ts
│   │   ├── InMemoryShipmentRepository.ts
│   │   └── InMemoryShipmentRepository.test.ts
│   ├── api/
│   │   ├── routes.ts
│   │   └── routes.test.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Dependencies

- `packages/shared` - EventBus, DomainEvent
- `hono` - API routes
- `Address` value object - copied from order-management (following existing pattern)

## State Transition Diagram

```
┌─────────┐
│ Pending │ ← OrderConfirmed event
└────┬────┘
     │ startPicking()
     ▼
┌─────────┐
│ Picking │
└────┬────┘
     │ markPacked()
     ▼
┌─────────┐
│ Packed  │
└────┬────┘
     │ dispatch(carrier, trackingNumber)
     ▼
┌───────────┐
│ Dispatched│
└────┬──────┘
     │ updateInTransit()
     ▼
┌───────────┐
│ InTransit │
└────┬──────┘
     │ markDelivered()
     ▼
┌───────────┐
│ Delivered │
└───────────┘
```
