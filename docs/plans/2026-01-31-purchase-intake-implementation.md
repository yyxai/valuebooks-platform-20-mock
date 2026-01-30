# Purchase Intake Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Purchase Intake domain package with entities, services, events, and API endpoints.

**Architecture:** Domain-Driven Design with clear separation - domain layer (entities, events), application layer (services), infrastructure layer (adapters, API). TDD throughout.

**Tech Stack:** TypeScript, Vitest, Hono, npm workspaces

---

## Task 1: Scaffold Monorepo Structure

**Files:**
- Create: `package.json` (root)
- Create: `tsconfig.json` (root)
- Create: `vitest.config.ts` (root)
- Create: `packages/purchase-intake/package.json`
- Create: `packages/purchase-intake/tsconfig.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`

**Step 1: Create root package.json**

```json
{
  "name": "valuebooks-platform",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

**Step 2: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist"
  }
}
```

**Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

**Step 4: Create packages/shared/package.json**

```json
{
  "name": "@valuebooks/shared",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  }
}
```

**Step 5: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 6: Create packages/purchase-intake/package.json**

```json
{
  "name": "@valuebooks/purchase-intake",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@valuebooks/shared": "*",
    "hono": "^4.0.0"
  }
}
```

**Step 7: Create packages/purchase-intake/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 8: Install dependencies**

Run: `npm install`
Expected: Dependencies installed, node_modules created

**Step 9: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts packages/
git commit -m "feat: scaffold monorepo with purchase-intake and shared packages"
```

---

## Task 2: Domain Events Infrastructure

**Files:**
- Create: `packages/shared/src/events/DomainEvent.ts`
- Create: `packages/shared/src/events/EventBus.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/events/EventBus.test.ts`

**Step 1: Write failing test for EventBus**

```typescript
// packages/shared/src/events/EventBus.test.ts
import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './EventBus';
import { DomainEvent } from './DomainEvent';

describe('EventBus', () => {
  it('should notify subscribers when event is published', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.subscribe('TestEvent', handler);
    bus.publish({ type: 'TestEvent', payload: { id: '123' }, timestamp: new Date() });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'TestEvent' }));
  });

  it('should not notify unsubscribed handlers', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    const unsubscribe = bus.subscribe('TestEvent', handler);
    unsubscribe();
    bus.publish({ type: 'TestEvent', payload: {}, timestamp: new Date() });

    expect(handler).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/shared/src/events/EventBus.test.ts`
Expected: FAIL - module not found

**Step 3: Create DomainEvent type**

```typescript
// packages/shared/src/events/DomainEvent.ts
export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
}
```

**Step 4: Create EventBus implementation**

```typescript
// packages/shared/src/events/EventBus.ts
import { DomainEvent } from './DomainEvent';

type EventHandler = (event: DomainEvent) => void;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  publish(event: DomainEvent): void {
    this.handlers.get(event.type)?.forEach(handler => handler(event));
  }
}
```

**Step 5: Create shared index**

```typescript
// packages/shared/src/index.ts
export { DomainEvent } from './events/DomainEvent';
export { EventBus } from './events/EventBus';
```

**Step 6: Run test to verify it passes**

Run: `npx vitest run packages/shared/src/events/EventBus.test.ts`
Expected: PASS (2 tests)

**Step 7: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add DomainEvent type and EventBus"
```

---

## Task 3: PurchaseRequest Entity - Value Objects

**Files:**
- Create: `packages/purchase-intake/src/domain/BoxDescription.ts`
- Create: `packages/purchase-intake/src/domain/Estimate.ts`
- Create: `packages/purchase-intake/src/domain/Customer.ts`
- Create: `packages/purchase-intake/src/domain/BoxDescription.test.ts`
- Create: `packages/purchase-intake/src/domain/Estimate.test.ts`

**Step 1: Write failing test for BoxDescription**

```typescript
// packages/purchase-intake/src/domain/BoxDescription.test.ts
import { describe, it, expect } from 'vitest';
import { BoxDescription, BookCategory, BookCondition } from './BoxDescription';

describe('BoxDescription', () => {
  it('should create valid box description', () => {
    const box = new BoxDescription(20, BookCategory.Fiction, BookCondition.Good);

    expect(box.quantity).toBe(20);
    expect(box.category).toBe(BookCategory.Fiction);
    expect(box.condition).toBe(BookCondition.Good);
  });

  it('should reject quantity less than 1', () => {
    expect(() => new BoxDescription(0, BookCategory.Fiction, BookCondition.Good))
      .toThrow('Quantity must be at least 1');
  });

  it('should reject quantity greater than 100', () => {
    expect(() => new BoxDescription(101, BookCategory.Fiction, BookCondition.Good))
      .toThrow('Quantity cannot exceed 100');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/purchase-intake/src/domain/BoxDescription.test.ts`
Expected: FAIL - module not found

**Step 3: Implement BoxDescription**

```typescript
// packages/purchase-intake/src/domain/BoxDescription.ts
export enum BookCategory {
  Fiction = 'fiction',
  NonFiction = 'non-fiction',
  Textbooks = 'textbooks',
  Children = 'children',
  Mixed = 'mixed',
}

export enum BookCondition {
  Excellent = 'excellent',
  Good = 'good',
  Fair = 'fair',
  Mixed = 'mixed',
}

export class BoxDescription {
  constructor(
    public readonly quantity: number,
    public readonly category: BookCategory,
    public readonly condition: BookCondition
  ) {
    if (quantity < 1) throw new Error('Quantity must be at least 1');
    if (quantity > 100) throw new Error('Quantity cannot exceed 100');
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/purchase-intake/src/domain/BoxDescription.test.ts`
Expected: PASS (3 tests)

**Step 5: Write failing test for Estimate**

```typescript
// packages/purchase-intake/src/domain/Estimate.test.ts
import { describe, it, expect } from 'vitest';
import { Estimate } from './Estimate';

describe('Estimate', () => {
  it('should create valid estimate with range', () => {
    const estimate = new Estimate(25, 40);

    expect(estimate.low).toBe(25);
    expect(estimate.high).toBe(40);
  });

  it('should reject when low is greater than high', () => {
    expect(() => new Estimate(50, 25)).toThrow('Low estimate cannot exceed high estimate');
  });

  it('should check if amount is within range', () => {
    const estimate = new Estimate(25, 40);

    expect(estimate.isWithinRange(30)).toBe(true);
    expect(estimate.isWithinRange(25)).toBe(true);
    expect(estimate.isWithinRange(40)).toBe(true);
    expect(estimate.isWithinRange(20)).toBe(false);
    expect(estimate.isWithinRange(45)).toBe(false);
  });
});
```

**Step 6: Implement Estimate**

```typescript
// packages/purchase-intake/src/domain/Estimate.ts
export class Estimate {
  constructor(
    public readonly low: number,
    public readonly high: number,
    public readonly lockedUntil?: Date
  ) {
    if (low > high) throw new Error('Low estimate cannot exceed high estimate');
  }

  isWithinRange(amount: number): boolean {
    return amount >= this.low && amount <= this.high;
  }
}
```

**Step 7: Run test to verify it passes**

Run: `npx vitest run packages/purchase-intake/src/domain/Estimate.test.ts`
Expected: PASS (3 tests)

**Step 8: Create Customer value object**

```typescript
// packages/purchase-intake/src/domain/Customer.ts
export interface Customer {
  email: string;
  name: string;
  address: Address;
  phone?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}
```

**Step 9: Commit**

```bash
git add packages/purchase-intake/src/domain/
git commit -m "feat(purchase-intake): add BoxDescription, Estimate, and Customer value objects"
```

---

## Task 4: PurchaseRequest Entity - Core

**Files:**
- Create: `packages/purchase-intake/src/domain/PurchaseRequest.ts`
- Create: `packages/purchase-intake/src/domain/PurchaseRequest.test.ts`
- Create: `packages/purchase-intake/src/domain/PurchaseRequestStatus.ts`

**Step 1: Create PurchaseRequestStatus enum**

```typescript
// packages/purchase-intake/src/domain/PurchaseRequestStatus.ts
export enum PurchaseRequestStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Shipped = 'shipped',
  Received = 'received',
  AwaitingDecision = 'awaiting_decision',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Completed = 'completed',
}
```

**Step 2: Write failing test for PurchaseRequest**

```typescript
// packages/purchase-intake/src/domain/PurchaseRequest.test.ts
import { describe, it, expect } from 'vitest';
import { PurchaseRequest } from './PurchaseRequest';
import { PurchaseRequestStatus } from './PurchaseRequestStatus';
import { BoxDescription, BookCategory, BookCondition } from './BoxDescription';
import { Estimate } from './Estimate';

describe('PurchaseRequest', () => {
  const customer = {
    email: 'test@example.com',
    name: 'Test User',
    address: { street: '123 Main St', city: 'Boston', state: 'MA', zip: '02101' },
  };
  const boxDescription = new BoxDescription(20, BookCategory.Fiction, BookCondition.Good);

  it('should create a draft purchase request', () => {
    const request = PurchaseRequest.create(customer, boxDescription);

    expect(request.status).toBe(PurchaseRequestStatus.Draft);
    expect(request.customer).toEqual(customer);
    expect(request.boxDescription).toEqual(boxDescription);
  });

  it('should submit with estimate', () => {
    const request = PurchaseRequest.create(customer, boxDescription);
    const estimate = new Estimate(25, 40);

    request.submit(estimate, 'TRACK123', 'https://label.pdf');

    expect(request.status).toBe(PurchaseRequestStatus.Submitted);
    expect(request.estimate).toEqual(estimate);
    expect(request.shipment?.trackingNumber).toBe('TRACK123');
  });

  it('should not submit if already submitted', () => {
    const request = PurchaseRequest.create(customer, boxDescription);
    request.submit(new Estimate(25, 40), 'TRACK123', 'https://label.pdf');

    expect(() => request.submit(new Estimate(30, 50), 'TRACK456', 'https://label2.pdf'))
      .toThrow('Cannot submit: current status is submitted');
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run packages/purchase-intake/src/domain/PurchaseRequest.test.ts`
Expected: FAIL - module not found

**Step 4: Implement PurchaseRequest**

```typescript
// packages/purchase-intake/src/domain/PurchaseRequest.ts
import { PurchaseRequestStatus } from './PurchaseRequestStatus';
import { BoxDescription } from './BoxDescription';
import { Estimate } from './Estimate';
import { Customer } from './Customer';

export interface Shipment {
  trackingNumber: string;
  carrier: string;
  labelUrl: string;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface Offer {
  amount: number;
  decidedAt?: Date;
  decision?: 'accept' | 'reject';
}

export interface Payment {
  method: 'ach' | 'store_credit';
  amount: number;
  processedAt?: Date;
}

export class PurchaseRequest {
  public readonly id: string;
  public status: PurchaseRequestStatus;
  public readonly customer: Customer;
  public boxDescription: BoxDescription;
  public estimate?: Estimate;
  public shipment?: Shipment;
  public offer?: Offer;
  public payment?: Payment;
  public readonly createdAt: Date;
  public updatedAt: Date;

  private constructor(id: string, customer: Customer, boxDescription: BoxDescription) {
    this.id = id;
    this.customer = customer;
    this.boxDescription = boxDescription;
    this.status = PurchaseRequestStatus.Draft;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static create(customer: Customer, boxDescription: BoxDescription): PurchaseRequest {
    const id = crypto.randomUUID();
    return new PurchaseRequest(id, customer, boxDescription);
  }

  submit(estimate: Estimate, trackingNumber: string, labelUrl: string): void {
    if (this.status !== PurchaseRequestStatus.Draft) {
      throw new Error(`Cannot submit: current status is ${this.status}`);
    }
    this.estimate = estimate;
    this.shipment = { trackingNumber, carrier: 'ups', labelUrl };
    this.status = PurchaseRequestStatus.Submitted;
    this.updatedAt = new Date();
  }

  markShipped(): void {
    if (this.status !== PurchaseRequestStatus.Submitted) {
      throw new Error(`Cannot mark shipped: current status is ${this.status}`);
    }
    this.shipment!.shippedAt = new Date();
    this.status = PurchaseRequestStatus.Shipped;
    this.updatedAt = new Date();
  }

  markReceived(): void {
    if (this.status !== PurchaseRequestStatus.Shipped) {
      throw new Error(`Cannot mark received: current status is ${this.status}`);
    }
    this.shipment!.deliveredAt = new Date();
    this.status = PurchaseRequestStatus.Received;
    this.updatedAt = new Date();
  }

  setOffer(amount: number): void {
    if (this.status !== PurchaseRequestStatus.Received) {
      throw new Error(`Cannot set offer: current status is ${this.status}`);
    }
    this.offer = { amount };

    if (this.estimate?.isWithinRange(amount)) {
      this.accept();
    } else {
      this.status = PurchaseRequestStatus.AwaitingDecision;
    }
    this.updatedAt = new Date();
  }

  accept(): void {
    if (this.status !== PurchaseRequestStatus.AwaitingDecision &&
        this.status !== PurchaseRequestStatus.Received) {
      throw new Error(`Cannot accept: current status is ${this.status}`);
    }
    this.offer!.decision = 'accept';
    this.offer!.decidedAt = new Date();
    this.status = PurchaseRequestStatus.Accepted;
    this.updatedAt = new Date();
  }

  reject(): void {
    if (this.status !== PurchaseRequestStatus.AwaitingDecision) {
      throw new Error(`Cannot reject: current status is ${this.status}`);
    }
    this.offer!.decision = 'reject';
    this.offer!.decidedAt = new Date();
    this.status = PurchaseRequestStatus.Rejected;
    this.updatedAt = new Date();
  }

  processPayment(method: 'ach' | 'store_credit'): void {
    if (this.status !== PurchaseRequestStatus.Accepted) {
      throw new Error(`Cannot process payment: current status is ${this.status}`);
    }
    const amount = method === 'store_credit'
      ? this.offer!.amount * 1.10
      : this.offer!.amount;
    this.payment = { method, amount, processedAt: new Date() };
    this.status = PurchaseRequestStatus.Completed;
    this.updatedAt = new Date();
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run packages/purchase-intake/src/domain/PurchaseRequest.test.ts`
Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add packages/purchase-intake/src/domain/
git commit -m "feat(purchase-intake): add PurchaseRequest entity with state machine"
```

---

## Task 5: EstimationService

**Files:**
- Create: `packages/purchase-intake/src/services/EstimationService.ts`
- Create: `packages/purchase-intake/src/services/EstimationService.test.ts`

**Step 1: Write failing test**

```typescript
// packages/purchase-intake/src/services/EstimationService.test.ts
import { describe, it, expect } from 'vitest';
import { EstimationService } from './EstimationService';
import { BoxDescription, BookCategory, BookCondition } from '../domain/BoxDescription';

describe('EstimationService', () => {
  const service = new EstimationService();

  it('should calculate estimate for fiction books in good condition', () => {
    const box = new BoxDescription(20, BookCategory.Fiction, BookCondition.Good);
    const estimate = service.calculateEstimate(box);

    expect(estimate.low).toBeGreaterThan(0);
    expect(estimate.high).toBeGreaterThan(estimate.low);
  });

  it('should give higher estimate for textbooks', () => {
    const fiction = new BoxDescription(10, BookCategory.Fiction, BookCondition.Good);
    const textbooks = new BoxDescription(10, BookCategory.Textbooks, BookCondition.Good);

    const fictionEstimate = service.calculateEstimate(fiction);
    const textbookEstimate = service.calculateEstimate(textbooks);

    expect(textbookEstimate.low).toBeGreaterThan(fictionEstimate.low);
  });

  it('should give higher estimate for excellent condition', () => {
    const good = new BoxDescription(10, BookCategory.Fiction, BookCondition.Good);
    const excellent = new BoxDescription(10, BookCategory.Fiction, BookCondition.Excellent);

    const goodEstimate = service.calculateEstimate(good);
    const excellentEstimate = service.calculateEstimate(excellent);

    expect(excellentEstimate.low).toBeGreaterThan(goodEstimate.low);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/purchase-intake/src/services/EstimationService.test.ts`
Expected: FAIL - module not found

**Step 3: Implement EstimationService**

```typescript
// packages/purchase-intake/src/services/EstimationService.ts
import { BoxDescription, BookCategory, BookCondition } from '../domain/BoxDescription';
import { Estimate } from '../domain/Estimate';

const CATEGORY_MULTIPLIERS: Record<BookCategory, number> = {
  [BookCategory.Fiction]: 1.0,
  [BookCategory.NonFiction]: 1.2,
  [BookCategory.Textbooks]: 2.5,
  [BookCategory.Children]: 0.8,
  [BookCategory.Mixed]: 1.0,
};

const CONDITION_MULTIPLIERS: Record<BookCondition, number> = {
  [BookCondition.Excellent]: 1.5,
  [BookCondition.Good]: 1.0,
  [BookCondition.Fair]: 0.5,
  [BookCondition.Mixed]: 0.7,
};

const BASE_PRICE_PER_BOOK = 1.50;
const ESTIMATE_VARIANCE = 0.3; // +/- 30%

export class EstimationService {
  calculateEstimate(box: BoxDescription): Estimate {
    const categoryMultiplier = CATEGORY_MULTIPLIERS[box.category];
    const conditionMultiplier = CONDITION_MULTIPLIERS[box.condition];

    const baseValue = box.quantity * BASE_PRICE_PER_BOOK * categoryMultiplier * conditionMultiplier;

    const low = Math.round(baseValue * (1 - ESTIMATE_VARIANCE));
    const high = Math.round(baseValue * (1 + ESTIMATE_VARIANCE));

    return new Estimate(low, high);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/purchase-intake/src/services/EstimationService.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add packages/purchase-intake/src/services/
git commit -m "feat(purchase-intake): add EstimationService with category/condition multipliers"
```

---

## Task 6: Domain Events

**Files:**
- Create: `packages/purchase-intake/src/domain/events/PurchaseIntakeEvents.ts`
- Create: `packages/purchase-intake/src/domain/events/index.ts`

**Step 1: Create domain event types**

```typescript
// packages/purchase-intake/src/domain/events/PurchaseIntakeEvents.ts
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
```

**Step 2: Create events index**

```typescript
// packages/purchase-intake/src/domain/events/index.ts
export * from './PurchaseIntakeEvents';
```

**Step 3: Commit**

```bash
git add packages/purchase-intake/src/domain/events/
git commit -m "feat(purchase-intake): add domain event types"
```

---

## Task 7: CarrierAdapter Interface

**Files:**
- Create: `packages/purchase-intake/src/infrastructure/CarrierAdapter.ts`
- Create: `packages/purchase-intake/src/infrastructure/MockCarrierAdapter.ts`
- Create: `packages/purchase-intake/src/infrastructure/MockCarrierAdapter.test.ts`

**Step 1: Create CarrierAdapter interface**

```typescript
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
    street: string;
    city: string;
    state: string;
    zip: string;
  }): Promise<ShippingLabel>;

  getTrackingStatus(trackingNumber: string): Promise<TrackingEvent[]>;

  scheduleReturn(trackingNumber: string): Promise<ShippingLabel>;
}
```

**Step 2: Write failing test for MockCarrierAdapter**

```typescript
// packages/purchase-intake/src/infrastructure/MockCarrierAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { MockCarrierAdapter } from './MockCarrierAdapter';

describe('MockCarrierAdapter', () => {
  const adapter = new MockCarrierAdapter();

  it('should generate a shipping label', async () => {
    const address = { street: '123 Main St', city: 'Boston', state: 'MA', zip: '02101' };
    const label = await adapter.generateLabel(address);

    expect(label.trackingNumber).toBeDefined();
    expect(label.labelUrl).toContain('http');
    expect(label.carrier).toBe('mock');
  });

  it('should return tracking events', async () => {
    const events = await adapter.getTrackingStatus('MOCK123');

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].status).toBe('label_created');
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run packages/purchase-intake/src/infrastructure/MockCarrierAdapter.test.ts`
Expected: FAIL - module not found

**Step 4: Implement MockCarrierAdapter**

```typescript
// packages/purchase-intake/src/infrastructure/MockCarrierAdapter.ts
import { CarrierAdapter, ShippingLabel, TrackingEvent } from './CarrierAdapter';

export class MockCarrierAdapter implements CarrierAdapter {
  async generateLabel(address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  }): Promise<ShippingLabel> {
    const trackingNumber = `MOCK${Date.now()}`;
    return {
      trackingNumber,
      labelUrl: `https://mock-carrier.example.com/labels/${trackingNumber}.pdf`,
      carrier: 'mock',
    };
  }

  async getTrackingStatus(trackingNumber: string): Promise<TrackingEvent[]> {
    return [
      { status: 'label_created', timestamp: new Date() },
    ];
  }

  async scheduleReturn(trackingNumber: string): Promise<ShippingLabel> {
    const returnTrackingNumber = `RET${trackingNumber}`;
    return {
      trackingNumber: returnTrackingNumber,
      labelUrl: `https://mock-carrier.example.com/labels/${returnTrackingNumber}.pdf`,
      carrier: 'mock',
    };
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run packages/purchase-intake/src/infrastructure/MockCarrierAdapter.test.ts`
Expected: PASS (2 tests)

**Step 6: Commit**

```bash
git add packages/purchase-intake/src/infrastructure/
git commit -m "feat(purchase-intake): add CarrierAdapter interface and mock implementation"
```

---

## Task 8: PurchaseRequestService

**Files:**
- Create: `packages/purchase-intake/src/services/PurchaseRequestService.ts`
- Create: `packages/purchase-intake/src/services/PurchaseRequestService.test.ts`

**Step 1: Write failing test**

```typescript
// packages/purchase-intake/src/services/PurchaseRequestService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { PurchaseRequestService } from './PurchaseRequestService';
import { EstimationService } from './EstimationService';
import { MockCarrierAdapter } from '../infrastructure/MockCarrierAdapter';
import { EventBus } from '@valuebooks/shared';
import { BookCategory, BookCondition } from '../domain/BoxDescription';
import { PurchaseIntakeEventTypes } from '../domain/events';

describe('PurchaseRequestService', () => {
  const eventBus = new EventBus();
  const estimationService = new EstimationService();
  const carrierAdapter = new MockCarrierAdapter();
  const service = new PurchaseRequestService(eventBus, estimationService, carrierAdapter);

  const customerData = {
    email: 'test@example.com',
    name: 'Test User',
    address: { street: '123 Main St', city: 'Boston', state: 'MA', zip: '02101' },
  };

  it('should create a draft purchase request', async () => {
    const request = await service.create(customerData, {
      quantity: 20,
      category: BookCategory.Fiction,
      condition: BookCondition.Good,
    });

    expect(request.id).toBeDefined();
    expect(request.status).toBe('draft');
  });

  it('should submit and emit event', async () => {
    const handler = vi.fn();
    eventBus.subscribe(PurchaseIntakeEventTypes.SUBMITTED, handler);

    const request = await service.create(customerData, {
      quantity: 20,
      category: BookCategory.Fiction,
      condition: BookCondition.Good,
    });
    await service.submit(request.id);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: PurchaseIntakeEventTypes.SUBMITTED })
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/purchase-intake/src/services/PurchaseRequestService.test.ts`
Expected: FAIL - module not found

**Step 3: Implement PurchaseRequestService**

```typescript
// packages/purchase-intake/src/services/PurchaseRequestService.ts
import { EventBus } from '@valuebooks/shared';
import { PurchaseRequest } from '../domain/PurchaseRequest';
import { BoxDescription, BookCategory, BookCondition } from '../domain/BoxDescription';
import { Customer } from '../domain/Customer';
import { EstimationService } from './EstimationService';
import { CarrierAdapter } from '../infrastructure/CarrierAdapter';
import { PurchaseIntakeEventTypes } from '../domain/events';

export class PurchaseRequestService {
  private requests = new Map<string, PurchaseRequest>();

  constructor(
    private eventBus: EventBus,
    private estimationService: EstimationService,
    private carrierAdapter: CarrierAdapter
  ) {}

  async create(
    customer: Customer,
    boxData: { quantity: number; category: BookCategory; condition: BookCondition }
  ): Promise<PurchaseRequest> {
    const boxDescription = new BoxDescription(boxData.quantity, boxData.category, boxData.condition);
    const request = PurchaseRequest.create(customer, boxDescription);
    this.requests.set(request.id, request);
    return request;
  }

  async submit(requestId: string): Promise<PurchaseRequest> {
    const request = this.getRequest(requestId);
    const estimate = this.estimationService.calculateEstimate(request.boxDescription);
    const label = await this.carrierAdapter.generateLabel(request.customer.address);

    request.submit(estimate, label.trackingNumber, label.labelUrl);

    this.eventBus.publish({
      type: PurchaseIntakeEventTypes.SUBMITTED,
      payload: {
        requestId: request.id,
        customerId: request.customer.email,
        trackingNumber: label.trackingNumber,
      },
      timestamp: new Date(),
    });

    return request;
  }

  async markReceived(requestId: string): Promise<PurchaseRequest> {
    const request = this.getRequest(requestId);
    request.markShipped(); // First mark as shipped
    request.markReceived();

    this.eventBus.publish({
      type: PurchaseIntakeEventTypes.RECEIVED,
      payload: {
        requestId: request.id,
        trackingNumber: request.shipment!.trackingNumber,
      },
      timestamp: new Date(),
    });

    return request;
  }

  async handleAppraisalCompleted(requestId: string, offerAmount: number): Promise<PurchaseRequest> {
    const request = this.getRequest(requestId);
    request.setOffer(offerAmount);
    return request;
  }

  async acceptOffer(requestId: string, paymentMethod: 'ach' | 'store_credit'): Promise<PurchaseRequest> {
    const request = this.getRequest(requestId);
    if (request.status === 'awaiting_decision') {
      request.accept();
    }
    request.processPayment(paymentMethod);

    this.eventBus.publish({
      type: PurchaseIntakeEventTypes.ACCEPTED,
      payload: {
        requestId: request.id,
        amount: request.payment!.amount,
        paymentMethod,
      },
      timestamp: new Date(),
    });

    return request;
  }

  async rejectOffer(requestId: string): Promise<PurchaseRequest> {
    const request = this.getRequest(requestId);
    request.reject();

    this.eventBus.publish({
      type: PurchaseIntakeEventTypes.REJECTED,
      payload: {
        requestId: request.id,
        trackingNumber: request.shipment!.trackingNumber,
      },
      timestamp: new Date(),
    });

    return request;
  }

  getRequest(requestId: string): PurchaseRequest {
    const request = this.requests.get(requestId);
    if (!request) throw new Error(`Purchase request not found: ${requestId}`);
    return request;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/purchase-intake/src/services/PurchaseRequestService.test.ts`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add packages/purchase-intake/src/services/
git commit -m "feat(purchase-intake): add PurchaseRequestService with event publishing"
```

---

## Task 9: Hono API Routes

**Files:**
- Create: `packages/purchase-intake/src/api/routes.ts`
- Create: `packages/purchase-intake/src/api/routes.test.ts`

**Step 1: Write failing test**

```typescript
// packages/purchase-intake/src/api/routes.test.ts
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createPurchaseIntakeRoutes } from './routes';
import { PurchaseRequestService } from '../services/PurchaseRequestService';
import { EstimationService } from '../services/EstimationService';
import { MockCarrierAdapter } from '../infrastructure/MockCarrierAdapter';
import { EventBus } from '@valuebooks/shared';

describe('Purchase Intake API', () => {
  const eventBus = new EventBus();
  const service = new PurchaseRequestService(
    eventBus,
    new EstimationService(),
    new MockCarrierAdapter()
  );
  const app = new Hono().route('/purchase-requests', createPurchaseIntakeRoutes(service));

  it('POST /purchase-requests should create a draft request', async () => {
    const res = await app.request('/purchase-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          email: 'test@example.com',
          name: 'Test User',
          address: { street: '123 Main St', city: 'Boston', state: 'MA', zip: '02101' },
        },
        box: { quantity: 20, category: 'fiction', condition: 'good' },
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.status).toBe('draft');
  });

  it('POST /purchase-requests/:id/submit should submit and return label', async () => {
    // Create first
    const createRes = await app.request('/purchase-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: {
          email: 'test@example.com',
          name: 'Test User',
          address: { street: '123 Main St', city: 'Boston', state: 'MA', zip: '02101' },
        },
        box: { quantity: 20, category: 'fiction', condition: 'good' },
      }),
    });
    const created = await createRes.json();

    // Submit
    const submitRes = await app.request(`/purchase-requests/${created.id}/submit`, {
      method: 'POST',
    });

    expect(submitRes.status).toBe(200);
    const data = await submitRes.json();
    expect(data.status).toBe('submitted');
    expect(data.shipment.trackingNumber).toBeDefined();
    expect(data.estimate).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/purchase-intake/src/api/routes.test.ts`
Expected: FAIL - module not found

**Step 3: Implement routes**

```typescript
// packages/purchase-intake/src/api/routes.ts
import { Hono } from 'hono';
import { PurchaseRequestService } from '../services/PurchaseRequestService';
import { BookCategory, BookCondition } from '../domain/BoxDescription';

export function createPurchaseIntakeRoutes(service: PurchaseRequestService): Hono {
  const app = new Hono();

  // Create new purchase request
  app.post('/', async (c) => {
    const body = await c.req.json();
    const request = await service.create(body.customer, {
      quantity: body.box.quantity,
      category: body.box.category as BookCategory,
      condition: body.box.condition as BookCondition,
    });
    return c.json(formatResponse(request), 201);
  });

  // Get purchase request by ID
  app.get('/:id', async (c) => {
    const request = service.getRequest(c.req.param('id'));
    return c.json(formatResponse(request));
  });

  // Submit purchase request (get label)
  app.post('/:id/submit', async (c) => {
    const request = await service.submit(c.req.param('id'));
    return c.json(formatResponse(request));
  });

  // Accept or reject offer
  app.post('/:id/decision', async (c) => {
    const body = await c.req.json();
    const id = c.req.param('id');

    if (body.decision === 'accept') {
      const request = await service.acceptOffer(id, body.paymentMethod || 'ach');
      return c.json(formatResponse(request));
    } else {
      const request = await service.rejectOffer(id);
      return c.json(formatResponse(request));
    }
  });

  return app;
}

function formatResponse(request: any) {
  return {
    id: request.id,
    status: request.status,
    customer: request.customer,
    boxDescription: request.boxDescription,
    estimate: request.estimate ? { low: request.estimate.low, high: request.estimate.high } : null,
    shipment: request.shipment || null,
    offer: request.offer || null,
    payment: request.payment || null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/purchase-intake/src/api/routes.test.ts`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add packages/purchase-intake/src/api/
git commit -m "feat(purchase-intake): add Hono API routes"
```

---

## Task 10: Package Exports and Final Integration

**Files:**
- Create: `packages/purchase-intake/src/index.ts`
- Modify: Test all packages together

**Step 1: Create package index**

```typescript
// packages/purchase-intake/src/index.ts
// Domain
export { PurchaseRequest } from './domain/PurchaseRequest';
export { PurchaseRequestStatus } from './domain/PurchaseRequestStatus';
export { BoxDescription, BookCategory, BookCondition } from './domain/BoxDescription';
export { Estimate } from './domain/Estimate';
export { Customer, Address } from './domain/Customer';

// Events
export * from './domain/events';

// Services
export { EstimationService } from './services/EstimationService';
export { PurchaseRequestService } from './services/PurchaseRequestService';

// Infrastructure
export { CarrierAdapter, ShippingLabel, TrackingEvent } from './infrastructure/CarrierAdapter';
export { MockCarrierAdapter } from './infrastructure/MockCarrierAdapter';

// API
export { createPurchaseIntakeRoutes } from './api/routes';
```

**Step 2: Run all tests**

Run: `npm run test`
Expected: All tests pass (approximately 15+ tests)

**Step 3: Final commit**

```bash
git add packages/purchase-intake/src/index.ts
git commit -m "feat(purchase-intake): add package exports"
```

---

## Summary

After completing all tasks:
- **11 commits** (1 scaffold + 9 features + 1 exports)
- **~15 tests** covering domain, services, and API
- **Full domain model** with state machine
- **Event-driven** architecture ready for Appraisal integration
- **Hono API** with create, submit, and decision endpoints
