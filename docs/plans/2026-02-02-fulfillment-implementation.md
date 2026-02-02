# Fulfillment Domain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the fulfillment domain package with Shipment entity, warehouse workflow lifecycle, and event-driven integration with order-management.

**Architecture:** Separate bounded context managing shipment lifecycle (Pending → Picking → Packed → Dispatched → InTransit → Delivered). Subscribes to OrderConfirmed events to create shipments. Publishes lifecycle events for other domains.

**Tech Stack:** TypeScript, Vitest, Hono, @valuebooks/shared (EventBus, DomainEvent)

---

## Task 1: Package Setup

**Files:**
- Create: `packages/fulfillment/package.json`
- Create: `packages/fulfillment/tsconfig.json`
- Create: `packages/fulfillment/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@valuebooks/fulfillment",
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

**Step 2: Create tsconfig.json**

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

**Step 3: Create placeholder index.ts**

```typescript
// @valuebooks/fulfillment - Fulfillment Domain
```

**Step 4: Install dependencies**

Run: `npm install`
Expected: Dependencies installed, package-lock.json updated

**Step 5: Commit**

```bash
git add packages/fulfillment/
git commit -m "chore(fulfillment): initialize package structure"
```

---

## Task 2: ShipmentStatus Enum

**Files:**
- Create: `packages/fulfillment/src/domain/ShipmentStatus.ts`

**Step 1: Write the test**

Create `packages/fulfillment/src/domain/ShipmentStatus.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ShipmentStatus } from './ShipmentStatus.js';

describe('ShipmentStatus', () => {
  it('should have all expected statuses', () => {
    expect(ShipmentStatus.Pending).toBe('pending');
    expect(ShipmentStatus.Picking).toBe('picking');
    expect(ShipmentStatus.Packed).toBe('packed');
    expect(ShipmentStatus.Dispatched).toBe('dispatched');
    expect(ShipmentStatus.InTransit).toBe('in_transit');
    expect(ShipmentStatus.Delivered).toBe('delivered');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/fulfillment/src/domain/ShipmentStatus.test.ts`
Expected: FAIL - Cannot find module

**Step 3: Write implementation**

Create `packages/fulfillment/src/domain/ShipmentStatus.ts`:

```typescript
export enum ShipmentStatus {
  Pending = 'pending',
  Picking = 'picking',
  Packed = 'packed',
  Dispatched = 'dispatched',
  InTransit = 'in_transit',
  Delivered = 'delivered',
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/fulfillment/src/domain/ShipmentStatus.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/fulfillment/src/domain/
git commit -m "feat(fulfillment): add ShipmentStatus enum"
```

---

## Task 3: Carrier Enum and TrackingUrlGenerator

**Files:**
- Create: `packages/fulfillment/src/domain/Carrier.ts`
- Create: `packages/fulfillment/src/domain/TrackingUrlGenerator.ts`

**Step 1: Write the Carrier test**

Create `packages/fulfillment/src/domain/Carrier.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Carrier } from './Carrier.js';

describe('Carrier', () => {
  it('should have Japan domestic carriers', () => {
    expect(Carrier.Yamato).toBe('yamato');
    expect(Carrier.Sagawa).toBe('sagawa');
    expect(Carrier.JapanPost).toBe('japan_post');
  });
});
```

**Step 2: Write the TrackingUrlGenerator test**

Create `packages/fulfillment/src/domain/TrackingUrlGenerator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Carrier } from './Carrier.js';
import { TrackingUrlGenerator } from './TrackingUrlGenerator.js';

describe('TrackingUrlGenerator', () => {
  it('should generate Yamato tracking URL', () => {
    const url = TrackingUrlGenerator.generate(Carrier.Yamato, '1234567890');
    expect(url).toBe(
      'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=1234567890'
    );
  });

  it('should generate Sagawa tracking URL', () => {
    const url = TrackingUrlGenerator.generate(Carrier.Sagawa, '9876543210');
    expect(url).toBe(
      'https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=9876543210'
    );
  });

  it('should generate Japan Post tracking URL', () => {
    const url = TrackingUrlGenerator.generate(Carrier.JapanPost, '1122334455');
    expect(url).toBe(
      'https://trackings.post.japanpost.jp/services/srv/search?requestNo1=1122334455'
    );
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run packages/fulfillment/src/domain/Carrier.test.ts packages/fulfillment/src/domain/TrackingUrlGenerator.test.ts`
Expected: FAIL - Cannot find modules

**Step 4: Write Carrier implementation**

Create `packages/fulfillment/src/domain/Carrier.ts`:

```typescript
export enum Carrier {
  Yamato = 'yamato',
  Sagawa = 'sagawa',
  JapanPost = 'japan_post',
}
```

**Step 5: Write TrackingUrlGenerator implementation**

Create `packages/fulfillment/src/domain/TrackingUrlGenerator.ts`:

```typescript
import { Carrier } from './Carrier.js';

const TRACKING_URL_TEMPLATES: Record<Carrier, string> = {
  [Carrier.Yamato]: 'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number={trackingNumber}',
  [Carrier.Sagawa]: 'https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo={trackingNumber}',
  [Carrier.JapanPost]: 'https://trackings.post.japanpost.jp/services/srv/search?requestNo1={trackingNumber}',
};

export class TrackingUrlGenerator {
  static generate(carrier: Carrier, trackingNumber: string): string {
    const template = TRACKING_URL_TEMPLATES[carrier];
    return template.replace('{trackingNumber}', trackingNumber);
  }
}
```

**Step 6: Run tests to verify they pass**

Run: `npx vitest run packages/fulfillment/src/domain/Carrier.test.ts packages/fulfillment/src/domain/TrackingUrlGenerator.test.ts`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/fulfillment/src/domain/
git commit -m "feat(fulfillment): add Carrier enum and TrackingUrlGenerator"
```

---

## Task 4: Address Value Object

**Files:**
- Create: `packages/fulfillment/src/domain/Address.ts`

**Step 1: Write the test**

Create `packages/fulfillment/src/domain/Address.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Address } from './Address.js';

describe('Address', () => {
  const validProps = {
    name: 'John Doe',
    street1: '123 Main St',
    city: 'Tokyo',
    state: 'Tokyo',
    postalCode: '100-0001',
  };

  describe('create', () => {
    it('should create a valid address', () => {
      const address = Address.create(validProps);
      expect(address.name).toBe('John Doe');
      expect(address.street1).toBe('123 Main St');
      expect(address.city).toBe('Tokyo');
      expect(address.state).toBe('Tokyo');
      expect(address.postalCode).toBe('100-0001');
      expect(address.country).toBe('JP');
    });

    it('should trim whitespace', () => {
      const address = Address.create({
        ...validProps,
        name: '  John Doe  ',
      });
      expect(address.name).toBe('John Doe');
    });

    it('should include optional street2', () => {
      const address = Address.create({
        ...validProps,
        street2: 'Apt 101',
      });
      expect(address.street2).toBe('Apt 101');
    });

    it('should throw if name is missing', () => {
      expect(() => Address.create({ ...validProps, name: '' })).toThrow(
        'Name is required'
      );
    });

    it('should throw if street1 is missing', () => {
      expect(() => Address.create({ ...validProps, street1: '' })).toThrow(
        'Street address is required'
      );
    });

    it('should throw if city is missing', () => {
      expect(() => Address.create({ ...validProps, city: '' })).toThrow(
        'City is required'
      );
    });

    it('should throw if state is missing', () => {
      expect(() => Address.create({ ...validProps, state: '' })).toThrow(
        'State is required'
      );
    });

    it('should throw if postalCode is missing', () => {
      expect(() => Address.create({ ...validProps, postalCode: '' })).toThrow(
        'Postal code is required'
      );
    });
  });

  describe('equals', () => {
    it('should return true for equal addresses', () => {
      const a = Address.create(validProps);
      const b = Address.create(validProps);
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different addresses', () => {
      const a = Address.create(validProps);
      const b = Address.create({ ...validProps, name: 'Jane Doe' });
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const address = Address.create(validProps);
      expect(address.toJSON()).toEqual({
        name: 'John Doe',
        street1: '123 Main St',
        street2: undefined,
        city: 'Tokyo',
        state: 'Tokyo',
        postalCode: '100-0001',
        country: 'JP',
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/fulfillment/src/domain/Address.test.ts`
Expected: FAIL - Cannot find module

**Step 3: Write implementation**

Create `packages/fulfillment/src/domain/Address.ts`:

```typescript
export interface AddressProps {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export class Address {
  readonly name: string;
  readonly street1: string;
  readonly street2?: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;

  private constructor(
    props: Required<Omit<AddressProps, 'street2'>> & Pick<AddressProps, 'street2'>
  ) {
    this.name = props.name;
    this.street1 = props.street1;
    this.street2 = props.street2;
    this.city = props.city;
    this.state = props.state;
    this.postalCode = props.postalCode;
    this.country = props.country;
  }

  static create(props: AddressProps): Address {
    if (!props.name?.trim()) {
      throw new Error('Name is required');
    }
    if (!props.street1?.trim()) {
      throw new Error('Street address is required');
    }
    if (!props.city?.trim()) {
      throw new Error('City is required');
    }
    if (!props.state?.trim()) {
      throw new Error('State is required');
    }
    if (!props.postalCode?.trim()) {
      throw new Error('Postal code is required');
    }

    return new Address({
      name: props.name.trim(),
      street1: props.street1.trim(),
      street2: props.street2?.trim(),
      city: props.city.trim(),
      state: props.state.trim(),
      postalCode: props.postalCode.trim(),
      country: props.country?.trim() ?? 'JP',
    });
  }

  equals(other: Address): boolean {
    return (
      this.name === other.name &&
      this.street1 === other.street1 &&
      this.street2 === other.street2 &&
      this.city === other.city &&
      this.state === other.state &&
      this.postalCode === other.postalCode &&
      this.country === other.country
    );
  }

  toJSON(): AddressProps & { country: string } {
    return {
      name: this.name,
      street1: this.street1,
      street2: this.street2,
      city: this.city,
      state: this.state,
      postalCode: this.postalCode,
      country: this.country,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/fulfillment/src/domain/Address.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/fulfillment/src/domain/
git commit -m "feat(fulfillment): add Address value object"
```

---

## Task 5: Shipment Entity

**Files:**
- Create: `packages/fulfillment/src/domain/Shipment.ts`

**Step 1: Write the test**

Create `packages/fulfillment/src/domain/Shipment.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Shipment } from './Shipment.js';
import { ShipmentStatus } from './ShipmentStatus.js';
import { Carrier } from './Carrier.js';
import { Address } from './Address.js';

describe('Shipment', () => {
  const validAddress = Address.create({
    name: 'John Doe',
    street1: '123 Main St',
    city: 'Tokyo',
    state: 'Tokyo',
    postalCode: '100-0001',
  });

  describe('create', () => {
    it('should create a shipment in Pending status', () => {
      const shipment = Shipment.create({
        orderId: 'order-123',
        shippingAddress: validAddress,
      });

      expect(shipment.id).toBeDefined();
      expect(shipment.orderId).toBe('order-123');
      expect(shipment.shippingAddress).toBe(validAddress);
      expect(shipment.status).toBe(ShipmentStatus.Pending);
      expect(shipment.carrier).toBeUndefined();
      expect(shipment.trackingNumber).toBeUndefined();
      expect(shipment.createdAt).toBeInstanceOf(Date);
      expect(shipment.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct a shipment from stored data', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');

      const shipment = Shipment.reconstruct({
        id: 'shipment-456',
        orderId: 'order-123',
        shippingAddress: validAddress,
        status: ShipmentStatus.Dispatched,
        carrier: Carrier.Yamato,
        trackingNumber: '1234567890',
        createdAt,
        updatedAt,
      });

      expect(shipment.id).toBe('shipment-456');
      expect(shipment.status).toBe(ShipmentStatus.Dispatched);
      expect(shipment.carrier).toBe(Carrier.Yamato);
      expect(shipment.trackingNumber).toBe('1234567890');
      expect(shipment.createdAt).toBe(createdAt);
      expect(shipment.updatedAt).toBe(updatedAt);
    });
  });

  describe('trackingUrl', () => {
    it('should return undefined when no carrier/tracking', () => {
      const shipment = Shipment.create({
        orderId: 'order-123',
        shippingAddress: validAddress,
      });
      expect(shipment.trackingUrl).toBeUndefined();
    });

    it('should generate tracking URL when dispatched', () => {
      const shipment = Shipment.reconstruct({
        id: 'shipment-456',
        orderId: 'order-123',
        shippingAddress: validAddress,
        status: ShipmentStatus.Dispatched,
        carrier: Carrier.Yamato,
        trackingNumber: '1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(shipment.trackingUrl).toBe(
        'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=1234567890'
      );
    });
  });

  describe('state transitions', () => {
    let shipment: Shipment;

    beforeEach(() => {
      shipment = Shipment.create({
        orderId: 'order-123',
        shippingAddress: validAddress,
      });
    });

    it('should transition Pending -> Picking', () => {
      const updated = shipment.startPicking();
      expect(updated.status).toBe(ShipmentStatus.Picking);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        shipment.updatedAt.getTime() - 1
      );
    });

    it('should throw if startPicking from non-Pending', () => {
      const picking = shipment.startPicking();
      expect(() => picking.startPicking()).toThrow(
        'Can only start picking from Pending status'
      );
    });

    it('should transition Picking -> Packed', () => {
      const picking = shipment.startPicking();
      const packed = picking.markPacked();
      expect(packed.status).toBe(ShipmentStatus.Packed);
    });

    it('should throw if markPacked from non-Picking', () => {
      expect(() => shipment.markPacked()).toThrow(
        'Can only mark packed from Picking status'
      );
    });

    it('should transition Packed -> Dispatched', () => {
      const packed = shipment.startPicking().markPacked();
      const dispatched = packed.dispatch(Carrier.Sagawa, '9876543210');

      expect(dispatched.status).toBe(ShipmentStatus.Dispatched);
      expect(dispatched.carrier).toBe(Carrier.Sagawa);
      expect(dispatched.trackingNumber).toBe('9876543210');
    });

    it('should throw if dispatch from non-Packed', () => {
      expect(() => shipment.dispatch(Carrier.Yamato, '123')).toThrow(
        'Can only dispatch from Packed status'
      );
    });

    it('should throw if dispatch without tracking number', () => {
      const packed = shipment.startPicking().markPacked();
      expect(() => packed.dispatch(Carrier.Yamato, '')).toThrow(
        'Tracking number is required'
      );
    });

    it('should transition Dispatched -> InTransit', () => {
      const dispatched = shipment
        .startPicking()
        .markPacked()
        .dispatch(Carrier.Yamato, '123');
      const inTransit = dispatched.updateInTransit();
      expect(inTransit.status).toBe(ShipmentStatus.InTransit);
    });

    it('should throw if updateInTransit from non-Dispatched', () => {
      expect(() => shipment.updateInTransit()).toThrow(
        'Can only update to in-transit from Dispatched status'
      );
    });

    it('should transition InTransit -> Delivered', () => {
      const inTransit = shipment
        .startPicking()
        .markPacked()
        .dispatch(Carrier.Yamato, '123')
        .updateInTransit();
      const delivered = inTransit.markDelivered();

      expect(delivered.status).toBe(ShipmentStatus.Delivered);
      expect(delivered.deliveredAt).toBeInstanceOf(Date);
    });

    it('should throw if markDelivered from non-InTransit', () => {
      expect(() => shipment.markDelivered()).toThrow(
        'Can only mark delivered from InTransit status'
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/fulfillment/src/domain/Shipment.test.ts`
Expected: FAIL - Cannot find module

**Step 3: Write implementation**

Create `packages/fulfillment/src/domain/Shipment.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/fulfillment/src/domain/Shipment.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/fulfillment/src/domain/
git commit -m "feat(fulfillment): add Shipment entity with state transitions"
```

---

## Task 6: Shipment Events

**Files:**
- Create: `packages/fulfillment/src/domain/events/ShipmentEventTypes.ts`
- Create: `packages/fulfillment/src/domain/events/index.ts`

**Step 1: Write the test**

Create `packages/fulfillment/src/domain/events/ShipmentEventTypes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ShipmentEventTypes } from './ShipmentEventTypes.js';

describe('ShipmentEventTypes', () => {
  it('should have all expected event types', () => {
    expect(ShipmentEventTypes.CREATED).toBe('ShipmentCreated');
    expect(ShipmentEventTypes.PICKING).toBe('ShipmentPicking');
    expect(ShipmentEventTypes.PACKED).toBe('ShipmentPacked');
    expect(ShipmentEventTypes.DISPATCHED).toBe('ShipmentDispatched');
    expect(ShipmentEventTypes.IN_TRANSIT).toBe('ShipmentInTransit');
    expect(ShipmentEventTypes.DELIVERED).toBe('ShipmentDelivered');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/fulfillment/src/domain/events/ShipmentEventTypes.test.ts`
Expected: FAIL - Cannot find module

**Step 3: Write ShipmentEventTypes implementation**

Create `packages/fulfillment/src/domain/events/ShipmentEventTypes.ts`:

```typescript
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
```

**Step 4: Create events index**

Create `packages/fulfillment/src/domain/events/index.ts`:

```typescript
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
} from './ShipmentEventTypes.js';
export { ShipmentEventTypes } from './ShipmentEventTypes.js';
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run packages/fulfillment/src/domain/events/ShipmentEventTypes.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/fulfillment/src/domain/events/
git commit -m "feat(fulfillment): add ShipmentEventTypes and payloads"
```

---

## Task 7: ShipmentRepository Interface and InMemory Implementation

**Files:**
- Create: `packages/fulfillment/src/infrastructure/ShipmentRepository.ts`
- Create: `packages/fulfillment/src/infrastructure/InMemoryShipmentRepository.ts`

**Step 1: Write the test**

Create `packages/fulfillment/src/infrastructure/InMemoryShipmentRepository.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryShipmentRepository } from './InMemoryShipmentRepository.js';
import { Shipment } from '../domain/Shipment.js';
import { ShipmentStatus } from '../domain/ShipmentStatus.js';
import { Address } from '../domain/Address.js';

describe('InMemoryShipmentRepository', () => {
  let repository: InMemoryShipmentRepository;
  const validAddress = Address.create({
    name: 'John Doe',
    street1: '123 Main St',
    city: 'Tokyo',
    state: 'Tokyo',
    postalCode: '100-0001',
  });

  beforeEach(() => {
    repository = new InMemoryShipmentRepository();
  });

  describe('save and findById', () => {
    it('should save and retrieve a shipment', async () => {
      const shipment = Shipment.create({
        orderId: 'order-123',
        shippingAddress: validAddress,
      });

      await repository.save(shipment);
      const found = await repository.findById(shipment.id);

      expect(found).toBe(shipment);
    });

    it('should return null for non-existent shipment', async () => {
      const found = await repository.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByOrderId', () => {
    it('should find shipment by order ID', async () => {
      const shipment = Shipment.create({
        orderId: 'order-123',
        shippingAddress: validAddress,
      });

      await repository.save(shipment);
      const found = await repository.findByOrderId('order-123');

      expect(found).toBe(shipment);
    });

    it('should return null for non-existent order ID', async () => {
      const found = await repository.findByOrderId('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByStatus', () => {
    it('should find shipments by status', async () => {
      const pending = Shipment.create({
        orderId: 'order-1',
        shippingAddress: validAddress,
      });
      const picking = Shipment.create({
        orderId: 'order-2',
        shippingAddress: validAddress,
      }).startPicking();

      await repository.save(pending);
      await repository.save(picking);

      const pendingShipments = await repository.findByStatus(
        ShipmentStatus.Pending
      );
      const pickingShipments = await repository.findByStatus(
        ShipmentStatus.Picking
      );

      expect(pendingShipments).toHaveLength(1);
      expect(pendingShipments[0].orderId).toBe('order-1');
      expect(pickingShipments).toHaveLength(1);
      expect(pickingShipments[0].orderId).toBe('order-2');
    });
  });

  describe('findAll', () => {
    it('should return all shipments', async () => {
      const shipment1 = Shipment.create({
        orderId: 'order-1',
        shippingAddress: validAddress,
      });
      const shipment2 = Shipment.create({
        orderId: 'order-2',
        shippingAddress: validAddress,
      });

      await repository.save(shipment1);
      await repository.save(shipment2);

      const all = await repository.findAll();
      expect(all).toHaveLength(2);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/fulfillment/src/infrastructure/InMemoryShipmentRepository.test.ts`
Expected: FAIL - Cannot find module

**Step 3: Write ShipmentRepository interface**

Create `packages/fulfillment/src/infrastructure/ShipmentRepository.ts`:

```typescript
import type { Shipment } from '../domain/Shipment.js';
import type { ShipmentStatus } from '../domain/ShipmentStatus.js';

export interface ShipmentRepository {
  save(shipment: Shipment): Promise<void>;
  findById(id: string): Promise<Shipment | null>;
  findByOrderId(orderId: string): Promise<Shipment | null>;
  findByStatus(status: ShipmentStatus): Promise<Shipment[]>;
  findAll(): Promise<Shipment[]>;
}
```

**Step 4: Write InMemoryShipmentRepository implementation**

Create `packages/fulfillment/src/infrastructure/InMemoryShipmentRepository.ts`:

```typescript
import type { Shipment } from '../domain/Shipment.js';
import type { ShipmentStatus } from '../domain/ShipmentStatus.js';
import type { ShipmentRepository } from './ShipmentRepository.js';

export class InMemoryShipmentRepository implements ShipmentRepository {
  private shipments = new Map<string, Shipment>();

  async save(shipment: Shipment): Promise<void> {
    this.shipments.set(shipment.id, shipment);
  }

  async findById(id: string): Promise<Shipment | null> {
    return this.shipments.get(id) ?? null;
  }

  async findByOrderId(orderId: string): Promise<Shipment | null> {
    for (const shipment of this.shipments.values()) {
      if (shipment.orderId === orderId) {
        return shipment;
      }
    }
    return null;
  }

  async findByStatus(status: ShipmentStatus): Promise<Shipment[]> {
    return Array.from(this.shipments.values()).filter(
      shipment => shipment.status === status
    );
  }

  async findAll(): Promise<Shipment[]> {
    return Array.from(this.shipments.values());
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run packages/fulfillment/src/infrastructure/InMemoryShipmentRepository.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/fulfillment/src/infrastructure/
git commit -m "feat(fulfillment): add ShipmentRepository interface and InMemory implementation"
```

---

## Task 8: FulfillmentService

**Files:**
- Create: `packages/fulfillment/src/services/FulfillmentService.ts`

**Step 1: Write the test**

Create `packages/fulfillment/src/services/FulfillmentService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@valuebooks/shared';
import { FulfillmentService } from './FulfillmentService.js';
import { InMemoryShipmentRepository } from '../infrastructure/InMemoryShipmentRepository.js';
import { ShipmentStatus } from '../domain/ShipmentStatus.js';
import { Carrier } from '../domain/Carrier.js';
import { Address } from '../domain/Address.js';
import { ShipmentEventTypes } from '../domain/events/index.js';

describe('FulfillmentService', () => {
  let service: FulfillmentService;
  let repository: InMemoryShipmentRepository;
  let eventBus: EventBus;
  let publishSpy: ReturnType<typeof vi.spyOn>;

  const validAddress = Address.create({
    name: 'John Doe',
    street1: '123 Main St',
    city: 'Tokyo',
    state: 'Tokyo',
    postalCode: '100-0001',
  });

  beforeEach(() => {
    repository = new InMemoryShipmentRepository();
    eventBus = new EventBus();
    publishSpy = vi.spyOn(eventBus, 'publish');
    service = new FulfillmentService(repository, eventBus);
  });

  describe('createShipment', () => {
    it('should create a shipment in Pending status', async () => {
      const shipment = await service.createShipment('order-123', validAddress);

      expect(shipment.orderId).toBe('order-123');
      expect(shipment.status).toBe(ShipmentStatus.Pending);
      expect(shipment.shippingAddress).toBe(validAddress);
    });

    it('should save shipment to repository', async () => {
      const shipment = await service.createShipment('order-123', validAddress);
      const found = await repository.findById(shipment.id);

      expect(found).toBe(shipment);
    });

    it('should publish ShipmentCreated event', async () => {
      const shipment = await service.createShipment('order-123', validAddress);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ShipmentEventTypes.CREATED,
          payload: expect.objectContaining({
            shipmentId: shipment.id,
            orderId: 'order-123',
          }),
        })
      );
    });
  });

  describe('startPicking', () => {
    it('should transition shipment to Picking', async () => {
      const created = await service.createShipment('order-123', validAddress);
      const picking = await service.startPicking(created.id);

      expect(picking.status).toBe(ShipmentStatus.Picking);
    });

    it('should publish ShipmentPicking event', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ShipmentEventTypes.PICKING,
        })
      );
    });

    it('should throw if shipment not found', async () => {
      await expect(service.startPicking('non-existent')).rejects.toThrow(
        'Shipment not found'
      );
    });
  });

  describe('markPacked', () => {
    it('should transition shipment to Packed', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      const packed = await service.markPacked(created.id);

      expect(packed.status).toBe(ShipmentStatus.Packed);
    });

    it('should publish ShipmentPacked event', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      await service.markPacked(created.id);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ShipmentEventTypes.PACKED,
        })
      );
    });
  });

  describe('dispatch', () => {
    it('should transition shipment to Dispatched with carrier info', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      await service.markPacked(created.id);
      const dispatched = await service.dispatch(
        created.id,
        Carrier.Yamato,
        '1234567890'
      );

      expect(dispatched.status).toBe(ShipmentStatus.Dispatched);
      expect(dispatched.carrier).toBe(Carrier.Yamato);
      expect(dispatched.trackingNumber).toBe('1234567890');
    });

    it('should publish ShipmentDispatched event with tracking URL', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      await service.markPacked(created.id);
      await service.dispatch(created.id, Carrier.Yamato, '1234567890');

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ShipmentEventTypes.DISPATCHED,
          payload: expect.objectContaining({
            carrier: Carrier.Yamato,
            trackingNumber: '1234567890',
            trackingUrl:
              'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=1234567890',
          }),
        })
      );
    });
  });

  describe('updateInTransit', () => {
    it('should transition shipment to InTransit', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      await service.markPacked(created.id);
      await service.dispatch(created.id, Carrier.Yamato, '123');
      const inTransit = await service.updateInTransit(created.id);

      expect(inTransit.status).toBe(ShipmentStatus.InTransit);
    });
  });

  describe('markDelivered', () => {
    it('should transition shipment to Delivered', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      await service.markPacked(created.id);
      await service.dispatch(created.id, Carrier.Yamato, '123');
      await service.updateInTransit(created.id);
      const delivered = await service.markDelivered(created.id);

      expect(delivered.status).toBe(ShipmentStatus.Delivered);
      expect(delivered.deliveredAt).toBeInstanceOf(Date);
    });

    it('should publish ShipmentDelivered event', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      await service.markPacked(created.id);
      await service.dispatch(created.id, Carrier.Yamato, '123');
      await service.updateInTransit(created.id);
      await service.markDelivered(created.id);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ShipmentEventTypes.DELIVERED,
          payload: expect.objectContaining({
            shipmentId: created.id,
            orderId: 'order-123',
          }),
        })
      );
    });
  });

  describe('queries', () => {
    it('should get shipment by order ID', async () => {
      const created = await service.createShipment('order-123', validAddress);
      const found = await service.getByOrderId('order-123');

      expect(found).toBe(created);
    });

    it('should get shipments by status', async () => {
      await service.createShipment('order-1', validAddress);
      const created2 = await service.createShipment('order-2', validAddress);
      await service.startPicking(created2.id);

      const pending = await service.getShipmentsByStatus(ShipmentStatus.Pending);
      const picking = await service.getShipmentsByStatus(ShipmentStatus.Picking);

      expect(pending).toHaveLength(1);
      expect(picking).toHaveLength(1);
    });

    it('should get all shipments', async () => {
      await service.createShipment('order-1', validAddress);
      await service.createShipment('order-2', validAddress);

      const all = await service.getAllShipments();
      expect(all).toHaveLength(2);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/fulfillment/src/services/FulfillmentService.test.ts`
Expected: FAIL - Cannot find module

**Step 3: Write implementation**

Create `packages/fulfillment/src/services/FulfillmentService.ts`:

```typescript
import type { EventBus } from '@valuebooks/shared';
import { Shipment } from '../domain/Shipment.js';
import type { Address } from '../domain/Address.js';
import type { Carrier } from '../domain/Carrier.js';
import type { ShipmentStatus } from '../domain/ShipmentStatus.js';
import { ShipmentEventTypes } from '../domain/events/index.js';
import type { ShipmentRepository } from '../infrastructure/ShipmentRepository.js';

export class FulfillmentService {
  constructor(
    private repository: ShipmentRepository,
    private eventBus: EventBus
  ) {}

  async createShipment(orderId: string, shippingAddress: Address): Promise<Shipment> {
    const shipment = Shipment.create({ orderId, shippingAddress });
    await this.repository.save(shipment);

    this.eventBus.publish({
      type: ShipmentEventTypes.CREATED,
      payload: {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        shippingAddress: shippingAddress.toJSON(),
      },
      timestamp: new Date(),
    });

    return shipment;
  }

  async startPicking(shipmentId: string): Promise<Shipment> {
    const shipment = await this.getShipmentOrThrow(shipmentId);
    const updated = shipment.startPicking();
    await this.repository.save(updated);

    this.eventBus.publish({
      type: ShipmentEventTypes.PICKING,
      payload: {
        shipmentId: updated.id,
        orderId: updated.orderId,
        status: updated.status,
      },
      timestamp: new Date(),
    });

    return updated;
  }

  async markPacked(shipmentId: string): Promise<Shipment> {
    const shipment = await this.getShipmentOrThrow(shipmentId);
    const updated = shipment.markPacked();
    await this.repository.save(updated);

    this.eventBus.publish({
      type: ShipmentEventTypes.PACKED,
      payload: {
        shipmentId: updated.id,
        orderId: updated.orderId,
        status: updated.status,
      },
      timestamp: new Date(),
    });

    return updated;
  }

  async dispatch(
    shipmentId: string,
    carrier: Carrier,
    trackingNumber: string
  ): Promise<Shipment> {
    const shipment = await this.getShipmentOrThrow(shipmentId);
    const updated = shipment.dispatch(carrier, trackingNumber);
    await this.repository.save(updated);

    this.eventBus.publish({
      type: ShipmentEventTypes.DISPATCHED,
      payload: {
        shipmentId: updated.id,
        orderId: updated.orderId,
        carrier: updated.carrier!,
        trackingNumber: updated.trackingNumber!,
        trackingUrl: updated.trackingUrl!,
      },
      timestamp: new Date(),
    });

    return updated;
  }

  async updateInTransit(shipmentId: string): Promise<Shipment> {
    const shipment = await this.getShipmentOrThrow(shipmentId);
    const updated = shipment.updateInTransit();
    await this.repository.save(updated);

    this.eventBus.publish({
      type: ShipmentEventTypes.IN_TRANSIT,
      payload: {
        shipmentId: updated.id,
        orderId: updated.orderId,
        status: updated.status,
      },
      timestamp: new Date(),
    });

    return updated;
  }

  async markDelivered(shipmentId: string): Promise<Shipment> {
    const shipment = await this.getShipmentOrThrow(shipmentId);
    const updated = shipment.markDelivered();
    await this.repository.save(updated);

    this.eventBus.publish({
      type: ShipmentEventTypes.DELIVERED,
      payload: {
        shipmentId: updated.id,
        orderId: updated.orderId,
        deliveredAt: updated.deliveredAt!,
      },
      timestamp: new Date(),
    });

    return updated;
  }

  async getByOrderId(orderId: string): Promise<Shipment | null> {
    return this.repository.findByOrderId(orderId);
  }

  async getShipmentsByStatus(status: ShipmentStatus): Promise<Shipment[]> {
    return this.repository.findByStatus(status);
  }

  async getAllShipments(): Promise<Shipment[]> {
    return this.repository.findAll();
  }

  private async getShipmentOrThrow(shipmentId: string): Promise<Shipment> {
    const shipment = await this.repository.findById(shipmentId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }
    return shipment;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/fulfillment/src/services/FulfillmentService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/fulfillment/src/services/
git commit -m "feat(fulfillment): add FulfillmentService with event publishing"
```

---

## Task 9: API Routes

**Files:**
- Create: `packages/fulfillment/src/api/routes.ts`

**Step 1: Write the test**

Create `packages/fulfillment/src/api/routes.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '@valuebooks/shared';
import { createFulfillmentRoutes } from './routes.js';
import { FulfillmentService } from '../services/FulfillmentService.js';
import { InMemoryShipmentRepository } from '../infrastructure/InMemoryShipmentRepository.js';
import { ShipmentStatus } from '../domain/ShipmentStatus.js';
import { Carrier } from '../domain/Carrier.js';
import { Address } from '../domain/Address.js';

describe('Fulfillment API Routes', () => {
  let app: ReturnType<typeof createFulfillmentRoutes>;
  let service: FulfillmentService;

  const validAddress = Address.create({
    name: 'John Doe',
    street1: '123 Main St',
    city: 'Tokyo',
    state: 'Tokyo',
    postalCode: '100-0001',
  });

  beforeEach(() => {
    const repository = new InMemoryShipmentRepository();
    const eventBus = new EventBus();
    service = new FulfillmentService(repository, eventBus);
    app = createFulfillmentRoutes(service);
  });

  describe('GET /shipments', () => {
    it('should return all shipments', async () => {
      await service.createShipment('order-1', validAddress);
      await service.createShipment('order-2', validAddress);

      const res = await app.request('/shipments');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const shipment = await service.createShipment('order-1', validAddress);
      await service.createShipment('order-2', validAddress);
      await service.startPicking(shipment.id);

      const res = await app.request('/shipments?status=picking');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].status).toBe('picking');
    });
  });

  describe('GET /shipments/:id', () => {
    it('should return shipment by ID', async () => {
      const shipment = await service.createShipment('order-123', validAddress);

      const res = await app.request(`/shipments/${shipment.id}`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe(shipment.id);
      expect(body.orderId).toBe('order-123');
    });

    it('should return 404 for non-existent shipment', async () => {
      const res = await app.request('/shipments/non-existent');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /shipments/order/:orderId', () => {
    it('should return shipment by order ID', async () => {
      await service.createShipment('order-123', validAddress);

      const res = await app.request('/shipments/order/order-123');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.orderId).toBe('order-123');
    });

    it('should return 404 for non-existent order', async () => {
      const res = await app.request('/shipments/order/non-existent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /shipments/:id/picking', () => {
    it('should start picking', async () => {
      const shipment = await service.createShipment('order-123', validAddress);

      const res = await app.request(`/shipments/${shipment.id}/picking`, {
        method: 'POST',
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('picking');
    });
  });

  describe('POST /shipments/:id/packed', () => {
    it('should mark as packed', async () => {
      const shipment = await service.createShipment('order-123', validAddress);
      await service.startPicking(shipment.id);

      const res = await app.request(`/shipments/${shipment.id}/packed`, {
        method: 'POST',
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('packed');
    });
  });

  describe('POST /shipments/:id/dispatch', () => {
    it('should dispatch with carrier and tracking', async () => {
      const shipment = await service.createShipment('order-123', validAddress);
      await service.startPicking(shipment.id);
      await service.markPacked(shipment.id);

      const res = await app.request(`/shipments/${shipment.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: 'yamato',
          trackingNumber: '1234567890',
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('dispatched');
      expect(body.carrier).toBe('yamato');
      expect(body.trackingNumber).toBe('1234567890');
      expect(body.trackingUrl).toBe(
        'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=1234567890'
      );
    });
  });

  describe('POST /shipments/:id/in-transit', () => {
    it('should update to in-transit', async () => {
      const shipment = await service.createShipment('order-123', validAddress);
      await service.startPicking(shipment.id);
      await service.markPacked(shipment.id);
      await service.dispatch(shipment.id, Carrier.Yamato, '123');

      const res = await app.request(`/shipments/${shipment.id}/in-transit`, {
        method: 'POST',
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('in_transit');
    });
  });

  describe('POST /shipments/:id/delivered', () => {
    it('should mark as delivered', async () => {
      const shipment = await service.createShipment('order-123', validAddress);
      await service.startPicking(shipment.id);
      await service.markPacked(shipment.id);
      await service.dispatch(shipment.id, Carrier.Yamato, '123');
      await service.updateInTransit(shipment.id);

      const res = await app.request(`/shipments/${shipment.id}/delivered`, {
        method: 'POST',
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('delivered');
      expect(body.deliveredAt).toBeDefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/fulfillment/src/api/routes.test.ts`
Expected: FAIL - Cannot find module

**Step 3: Write implementation**

Create `packages/fulfillment/src/api/routes.ts`:

```typescript
import { Hono } from 'hono';
import type { Shipment } from '../domain/Shipment.js';
import { Carrier } from '../domain/Carrier.js';
import type { ShipmentStatus } from '../domain/ShipmentStatus.js';
import type { FulfillmentService } from '../services/FulfillmentService.js';

export function createFulfillmentRoutes(service: FulfillmentService): Hono {
  const app = new Hono();

  // List shipments (optional status filter)
  app.get('/shipments', async (c) => {
    const status = c.req.query('status') as ShipmentStatus | undefined;
    const shipments = status
      ? await service.getShipmentsByStatus(status)
      : await service.getAllShipments();
    return c.json(shipments.map(formatShipment));
  });

  // Get shipment by ID
  app.get('/shipments/:id', async (c) => {
    const shipment = await service.getByOrderId(c.req.param('id'));
    // Try by shipment ID first via getAllShipments (repository doesn't have findById exposed)
    const all = await service.getAllShipments();
    const found = all.find((s) => s.id === c.req.param('id'));
    if (!found) {
      return c.json({ error: 'Shipment not found' }, 404);
    }
    return c.json(formatShipment(found));
  });

  // Get shipment by order ID
  app.get('/shipments/order/:orderId', async (c) => {
    const shipment = await service.getByOrderId(c.req.param('orderId'));
    if (!shipment) {
      return c.json({ error: 'Shipment not found' }, 404);
    }
    return c.json(formatShipment(shipment));
  });

  // Start picking
  app.post('/shipments/:id/picking', async (c) => {
    try {
      const shipment = await service.startPicking(c.req.param('id'));
      return c.json(formatShipment(shipment));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  // Mark packed
  app.post('/shipments/:id/packed', async (c) => {
    try {
      const shipment = await service.markPacked(c.req.param('id'));
      return c.json(formatShipment(shipment));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  // Dispatch
  app.post('/shipments/:id/dispatch', async (c) => {
    try {
      const body = await c.req.json();
      const carrier = body.carrier as Carrier;
      const shipment = await service.dispatch(
        c.req.param('id'),
        carrier,
        body.trackingNumber
      );
      return c.json(formatShipment(shipment));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  // Update to in-transit
  app.post('/shipments/:id/in-transit', async (c) => {
    try {
      const shipment = await service.updateInTransit(c.req.param('id'));
      return c.json(formatShipment(shipment));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  // Mark delivered
  app.post('/shipments/:id/delivered', async (c) => {
    try {
      const shipment = await service.markDelivered(c.req.param('id'));
      return c.json(formatShipment(shipment));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  return app;
}

function formatShipment(shipment: Shipment) {
  return {
    id: shipment.id,
    orderId: shipment.orderId,
    status: shipment.status,
    shippingAddress: shipment.shippingAddress.toJSON(),
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    deliveredAt: shipment.deliveredAt,
    createdAt: shipment.createdAt,
    updatedAt: shipment.updatedAt,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/fulfillment/src/api/routes.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/fulfillment/src/api/
git commit -m "feat(fulfillment): add API routes for warehouse operations"
```

---

## Task 10: Package Exports and Final Integration

**Files:**
- Modify: `packages/fulfillment/src/index.ts`

**Step 1: Update index.ts with all exports**

```typescript
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
```

**Step 2: Run all tests**

Run: `npm run test -w packages/fulfillment`
Expected: All tests pass

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors

**Step 4: Commit**

```bash
git add packages/fulfillment/src/index.ts
git commit -m "feat(fulfillment): complete package exports"
```

---

## Task 11: Update TODO.md

**Files:**
- Modify: `TODO.md`

**Step 1: Update TODO.md**

Mark fulfillment domain tasks as complete:

```markdown
## Done
- [x] purchase-intake - Complete domain package
- [x] appraisal - Complete domain package
- [x] listing - Complete domain package
- [x] order-management - Complete domain package
- [x] apps/b2c - Customer storefront (scaffold)
- [x] fulfillment/domain - Shipment, Tracking entities
- [x] fulfillment/services - FulfillmentService
- [x] fulfillment/repository - ShipmentRepository
- [x] fulfillment/api - API routes
```

**Step 2: Commit**

```bash
git add TODO.md
git commit -m "docs: mark fulfillment domain as complete in TODO"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Package Setup | package.json, tsconfig.json, index.ts |
| 2 | ShipmentStatus Enum | ShipmentStatus.ts |
| 3 | Carrier & TrackingUrlGenerator | Carrier.ts, TrackingUrlGenerator.ts |
| 4 | Address Value Object | Address.ts |
| 5 | Shipment Entity | Shipment.ts |
| 6 | Shipment Events | events/ShipmentEventTypes.ts, events/index.ts |
| 7 | Repository | ShipmentRepository.ts, InMemoryShipmentRepository.ts |
| 8 | FulfillmentService | FulfillmentService.ts |
| 9 | API Routes | routes.ts |
| 10 | Package Exports | index.ts |
| 11 | Update TODO | TODO.md |

Total: 11 tasks, ~45 steps
