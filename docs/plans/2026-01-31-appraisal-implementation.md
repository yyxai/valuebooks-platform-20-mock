# Appraisal Domain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Appraisal domain for evaluating books and generating offers

**Architecture:** Domain-driven design with AppraisalService orchestrating book scanning, price calculation, and event emission. Uses Open Library API for ISBN lookup.

**Tech Stack:** TypeScript, Vitest, Hono, Open Library API

---

## Task 1: Domain - Condition and AppraisedBook

**Files:**
- Create: `packages/appraisal/src/domain/Condition.ts`
- Create: `packages/appraisal/src/domain/AppraisedBook.ts`
- Test: `packages/appraisal/src/domain/AppraisedBook.test.ts`

**Step 1: Create package structure**

```bash
mkdir -p packages/appraisal/src/domain
mkdir -p packages/appraisal/src/services
mkdir -p packages/appraisal/src/infrastructure
mkdir -p packages/appraisal/src/api
```

**Step 2: Create package.json**

Create `packages/appraisal/package.json`:

```json
{
  "name": "@valuebooks/appraisal",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@valuebooks/shared": "*",
    "hono": "^4.4.0"
  },
  "devDependencies": {
    "vitest": "^1.6.0"
  }
}
```

**Step 3: Write the failing test**

Create `packages/appraisal/src/domain/AppraisedBook.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { AppraisedBook, Condition, CONDITION_MULTIPLIERS } from './AppraisedBook.js';

describe('Condition', () => {
  it('has correct multipliers', () => {
    expect(CONDITION_MULTIPLIERS[Condition.Excellent]).toBe(0.8);
    expect(CONDITION_MULTIPLIERS[Condition.Good]).toBe(0.6);
    expect(CONDITION_MULTIPLIERS[Condition.Fair]).toBe(0.4);
    expect(CONDITION_MULTIPLIERS[Condition.Poor]).toBe(0.1);
  });
});

describe('AppraisedBook', () => {
  it('calculates offer price from base price and condition', () => {
    const book = new AppraisedBook(
      '978-0-13-468599-1',
      'Clean Code',
      'Robert C. Martin',
      Condition.Good,
      10.00
    );

    expect(book.offerPrice).toBe(6.00); // 10 * 0.6
  });

  it('rounds offer price to 2 decimal places', () => {
    const book = new AppraisedBook(
      '978-0-13-468599-1',
      'Clean Code',
      'Robert C. Martin',
      Condition.Excellent,
      9.99
    );

    expect(book.offerPrice).toBe(7.99); // 9.99 * 0.8 = 7.992 → 7.99
  });
});
```

**Step 4: Run test to verify it fails**

Run: `npx vitest run packages/appraisal/src/domain/AppraisedBook.test.ts`
Expected: FAIL with "Cannot find module"

**Step 5: Write minimal implementation**

Create `packages/appraisal/src/domain/AppraisedBook.ts`:

```typescript
export enum Condition {
  Excellent = 'excellent',
  Good = 'good',
  Fair = 'fair',
  Poor = 'poor',
}

export const CONDITION_MULTIPLIERS: Record<Condition, number> = {
  [Condition.Excellent]: 0.8,
  [Condition.Good]: 0.6,
  [Condition.Fair]: 0.4,
  [Condition.Poor]: 0.1,
};

export class AppraisedBook {
  public readonly offerPrice: number;

  constructor(
    public readonly isbn: string,
    public readonly title: string,
    public readonly author: string,
    public readonly condition: Condition,
    public readonly basePrice: number
  ) {
    const multiplier = CONDITION_MULTIPLIERS[condition];
    this.offerPrice = Math.round(basePrice * multiplier * 100) / 100;
  }
}
```

**Step 6: Run test to verify it passes**

Run: `npx vitest run packages/appraisal/src/domain/AppraisedBook.test.ts`
Expected: PASS (3 tests)

**Step 7: Commit**

```bash
git add packages/appraisal
git commit -m "feat(appraisal): add Condition enum and AppraisedBook value object"
```

---

## Task 2: Domain - Appraisal Aggregate

**Files:**
- Create: `packages/appraisal/src/domain/Appraisal.ts`
- Test: `packages/appraisal/src/domain/Appraisal.test.ts`

**Step 1: Write the failing test**

Create `packages/appraisal/src/domain/Appraisal.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Appraisal, AppraisalStatus } from './Appraisal.js';
import { AppraisedBook, Condition } from './AppraisedBook.js';

describe('Appraisal', () => {
  it('creates with pending status and empty books', () => {
    const appraisal = new Appraisal('appr-1', 'pr-123');

    expect(appraisal.id).toBe('appr-1');
    expect(appraisal.purchaseRequestId).toBe('pr-123');
    expect(appraisal.status).toBe(AppraisalStatus.Pending);
    expect(appraisal.books).toEqual([]);
    expect(appraisal.totalOffer).toBe(0);
  });

  it('adds book and updates total offer', () => {
    const appraisal = new Appraisal('appr-1', 'pr-123');
    const book = new AppraisedBook('isbn-1', 'Title', 'Author', Condition.Good, 10);

    appraisal.addBook(book);

    expect(appraisal.books).toHaveLength(1);
    expect(appraisal.totalOffer).toBe(6.00);
    expect(appraisal.status).toBe(AppraisalStatus.InProgress);
  });

  it('removes book by ISBN', () => {
    const appraisal = new Appraisal('appr-1', 'pr-123');
    appraisal.addBook(new AppraisedBook('isbn-1', 'Title1', 'Author1', Condition.Good, 10));
    appraisal.addBook(new AppraisedBook('isbn-2', 'Title2', 'Author2', Condition.Fair, 10));

    appraisal.removeBook('isbn-1');

    expect(appraisal.books).toHaveLength(1);
    expect(appraisal.books[0].isbn).toBe('isbn-2');
    expect(appraisal.totalOffer).toBe(4.00);
  });

  it('completes appraisal', () => {
    const appraisal = new Appraisal('appr-1', 'pr-123');
    appraisal.addBook(new AppraisedBook('isbn-1', 'Title', 'Author', Condition.Good, 10));

    appraisal.complete();

    expect(appraisal.status).toBe(AppraisalStatus.Completed);
    expect(appraisal.completedAt).toBeInstanceOf(Date);
  });

  it('throws when completing empty appraisal', () => {
    const appraisal = new Appraisal('appr-1', 'pr-123');

    expect(() => appraisal.complete()).toThrow('Cannot complete appraisal with no books');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/appraisal/src/domain/Appraisal.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `packages/appraisal/src/domain/Appraisal.ts`:

```typescript
import { AppraisedBook } from './AppraisedBook.js';

export enum AppraisalStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
}

export class Appraisal {
  public status: AppraisalStatus = AppraisalStatus.Pending;
  public books: AppraisedBook[] = [];
  public completedAt: Date | null = null;

  constructor(
    public readonly id: string,
    public readonly purchaseRequestId: string
  ) {}

  get totalOffer(): number {
    return this.books.reduce((sum, book) => sum + book.offerPrice, 0);
  }

  addBook(book: AppraisedBook): void {
    this.books.push(book);
    if (this.status === AppraisalStatus.Pending) {
      this.status = AppraisalStatus.InProgress;
    }
  }

  removeBook(isbn: string): void {
    this.books = this.books.filter((book) => book.isbn !== isbn);
  }

  complete(): void {
    if (this.books.length === 0) {
      throw new Error('Cannot complete appraisal with no books');
    }
    this.status = AppraisalStatus.Completed;
    this.completedAt = new Date();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/appraisal/src/domain/Appraisal.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add packages/appraisal/src/domain/Appraisal.ts packages/appraisal/src/domain/Appraisal.test.ts
git commit -m "feat(appraisal): add Appraisal aggregate root"
```

---

## Task 3: Infrastructure - BookLookupService

**Files:**
- Create: `packages/appraisal/src/infrastructure/BookLookupService.ts`
- Create: `packages/appraisal/src/infrastructure/OpenLibraryAdapter.ts`
- Test: `packages/appraisal/src/infrastructure/BookLookupService.test.ts`

**Step 1: Write the failing test**

Create `packages/appraisal/src/infrastructure/BookLookupService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MockBookLookupService } from './BookLookupService.js';

describe('MockBookLookupService', () => {
  it('returns book info for known ISBN', async () => {
    const service = new MockBookLookupService();

    const result = await service.lookupByIsbn('978-0-13-468599-1');

    expect(result).toEqual({
      title: 'Clean Code',
      author: 'Robert C. Martin',
      basePrice: 10.00,
    });
  });

  it('returns null for unknown ISBN', async () => {
    const service = new MockBookLookupService();

    const result = await service.lookupByIsbn('unknown-isbn');

    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/appraisal/src/infrastructure/BookLookupService.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `packages/appraisal/src/infrastructure/BookLookupService.ts`:

```typescript
export interface BookInfo {
  title: string;
  author: string;
  basePrice: number;
}

export interface BookLookupService {
  lookupByIsbn(isbn: string): Promise<BookInfo | null>;
}

const MOCK_BOOKS: Record<string, BookInfo> = {
  '978-0-13-468599-1': {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    basePrice: 10.00,
  },
  '978-0-201-63361-0': {
    title: 'Design Patterns',
    author: 'Gang of Four',
    basePrice: 15.00,
  },
};

export class MockBookLookupService implements BookLookupService {
  async lookupByIsbn(isbn: string): Promise<BookInfo | null> {
    return MOCK_BOOKS[isbn] ?? null;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/appraisal/src/infrastructure/BookLookupService.test.ts`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add packages/appraisal/src/infrastructure
git commit -m "feat(appraisal): add BookLookupService interface and mock"
```

---

## Task 4: Services - AppraisalService

**Files:**
- Create: `packages/appraisal/src/services/AppraisalService.ts`
- Test: `packages/appraisal/src/services/AppraisalService.test.ts`

**Step 1: Write the failing test**

Create `packages/appraisal/src/services/AppraisalService.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { AppraisalService } from './AppraisalService.js';
import { MockBookLookupService } from '../infrastructure/BookLookupService.js';
import { Condition } from '../domain/AppraisedBook.js';
import { AppraisalStatus } from '../domain/Appraisal.js';
import { EventBus } from '@valuebooks/shared';

describe('AppraisalService', () => {
  it('creates appraisal for purchase request', async () => {
    const eventBus = new EventBus();
    const bookLookup = new MockBookLookupService();
    const service = new AppraisalService(eventBus, bookLookup);

    const appraisal = await service.create('pr-123');

    expect(appraisal.purchaseRequestId).toBe('pr-123');
    expect(appraisal.status).toBe(AppraisalStatus.Pending);
  });

  it('adds book by ISBN and condition', async () => {
    const eventBus = new EventBus();
    const bookLookup = new MockBookLookupService();
    const service = new AppraisalService(eventBus, bookLookup);

    const appraisal = await service.create('pr-123');
    const updated = await service.addBook(appraisal.id, '978-0-13-468599-1', Condition.Good);

    expect(updated.books).toHaveLength(1);
    expect(updated.books[0].title).toBe('Clean Code');
    expect(updated.books[0].offerPrice).toBe(6.00);
  });

  it('throws when adding unknown ISBN', async () => {
    const eventBus = new EventBus();
    const bookLookup = new MockBookLookupService();
    const service = new AppraisalService(eventBus, bookLookup);

    const appraisal = await service.create('pr-123');

    await expect(
      service.addBook(appraisal.id, 'unknown-isbn', Condition.Good)
    ).rejects.toThrow('Book not found');
  });

  it('emits AppraisalCompleted event on complete', async () => {
    const eventBus = new EventBus();
    const bookLookup = new MockBookLookupService();
    const service = new AppraisalService(eventBus, bookLookup);
    const handler = vi.fn();
    eventBus.subscribe('appraisal.completed', handler);

    const appraisal = await service.create('pr-123');
    await service.addBook(appraisal.id, '978-0-13-468599-1', Condition.Good);
    await service.complete(appraisal.id);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'appraisal.completed',
        payload: {
          appraisalId: appraisal.id,
          purchaseRequestId: 'pr-123',
          totalOffer: 6.00,
          bookCount: 1,
        },
      })
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/appraisal/src/services/AppraisalService.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `packages/appraisal/src/services/AppraisalService.ts`:

```typescript
import { EventBus } from '@valuebooks/shared';
import { Appraisal } from '../domain/Appraisal.js';
import { AppraisedBook, Condition } from '../domain/AppraisedBook.js';
import { BookLookupService } from '../infrastructure/BookLookupService.js';

export class AppraisalService {
  private appraisals: Map<string, Appraisal> = new Map();

  constructor(
    private eventBus: EventBus,
    private bookLookup: BookLookupService
  ) {}

  async create(purchaseRequestId: string): Promise<Appraisal> {
    const id = `appr-${Date.now()}`;
    const appraisal = new Appraisal(id, purchaseRequestId);
    this.appraisals.set(id, appraisal);
    return appraisal;
  }

  async addBook(appraisalId: string, isbn: string, condition: Condition): Promise<Appraisal> {
    const appraisal = this.appraisals.get(appraisalId);
    if (!appraisal) {
      throw new Error('Appraisal not found');
    }

    const bookInfo = await this.bookLookup.lookupByIsbn(isbn);
    if (!bookInfo) {
      throw new Error('Book not found');
    }

    const book = new AppraisedBook(
      isbn,
      bookInfo.title,
      bookInfo.author,
      condition,
      bookInfo.basePrice
    );

    appraisal.addBook(book);
    return appraisal;
  }

  async removeBook(appraisalId: string, isbn: string): Promise<Appraisal> {
    const appraisal = this.appraisals.get(appraisalId);
    if (!appraisal) {
      throw new Error('Appraisal not found');
    }

    appraisal.removeBook(isbn);
    return appraisal;
  }

  async complete(appraisalId: string): Promise<Appraisal> {
    const appraisal = this.appraisals.get(appraisalId);
    if (!appraisal) {
      throw new Error('Appraisal not found');
    }

    appraisal.complete();

    this.eventBus.publish({
      type: 'appraisal.completed',
      payload: {
        appraisalId: appraisal.id,
        purchaseRequestId: appraisal.purchaseRequestId,
        totalOffer: appraisal.totalOffer,
        bookCount: appraisal.books.length,
      },
      timestamp: new Date(),
    });

    return appraisal;
  }

  async getById(appraisalId: string): Promise<Appraisal | undefined> {
    return this.appraisals.get(appraisalId);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/appraisal/src/services/AppraisalService.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add packages/appraisal/src/services
git commit -m "feat(appraisal): add AppraisalService with event emission"
```

---

## Task 5: API - Hono Routes

**Files:**
- Create: `packages/appraisal/src/api/routes.ts`
- Test: `packages/appraisal/src/api/routes.test.ts`

**Step 1: Write the failing test**

Create `packages/appraisal/src/api/routes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createAppraisalRoutes } from './routes.js';
import { AppraisalService } from '../services/AppraisalService.js';
import { MockBookLookupService } from '../infrastructure/BookLookupService.js';
import { EventBus } from '@valuebooks/shared';

describe('Appraisal API', () => {
  function createApp() {
    const eventBus = new EventBus();
    const bookLookup = new MockBookLookupService();
    const service = new AppraisalService(eventBus, bookLookup);
    const app = new Hono();
    app.route('/appraisals', createAppraisalRoutes(service));
    return app;
  }

  it('POST /appraisals creates new appraisal', async () => {
    const app = createApp();

    const res = await app.request('/appraisals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseRequestId: 'pr-123' }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.purchaseRequestId).toBe('pr-123');
    expect(data.status).toBe('pending');
  });

  it('POST /appraisals/:id/books adds book', async () => {
    const app = createApp();

    // Create appraisal first
    const createRes = await app.request('/appraisals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseRequestId: 'pr-123' }),
    });
    const { id } = await createRes.json();

    // Add book
    const res = await app.request(`/appraisals/${id}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isbn: '978-0-13-468599-1', condition: 'good' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.books).toHaveLength(1);
    expect(data.books[0].title).toBe('Clean Code');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/appraisal/src/api/routes.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `packages/appraisal/src/api/routes.ts`:

```typescript
import { Hono } from 'hono';
import { AppraisalService } from '../services/AppraisalService.js';
import { Condition } from '../domain/AppraisedBook.js';

export function createAppraisalRoutes(service: AppraisalService) {
  const app = new Hono();

  app.post('/', async (c) => {
    const { purchaseRequestId } = await c.req.json();
    const appraisal = await service.create(purchaseRequestId);
    return c.json(appraisal, 201);
  });

  app.get('/:id', async (c) => {
    const appraisal = await service.getById(c.req.param('id'));
    if (!appraisal) {
      return c.json({ error: 'Appraisal not found' }, 404);
    }
    return c.json(appraisal);
  });

  app.post('/:id/books', async (c) => {
    const { isbn, condition } = await c.req.json();
    const appraisal = await service.addBook(
      c.req.param('id'),
      isbn,
      condition as Condition
    );
    return c.json(appraisal);
  });

  app.delete('/:id/books/:isbn', async (c) => {
    const appraisal = await service.removeBook(
      c.req.param('id'),
      c.req.param('isbn')
    );
    return c.json(appraisal);
  });

  app.post('/:id/complete', async (c) => {
    const appraisal = await service.complete(c.req.param('id'));
    return c.json(appraisal);
  });

  return app;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run packages/appraisal/src/api/routes.test.ts`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add packages/appraisal/src/api
git commit -m "feat(appraisal): add Hono API routes"
```

---

## Task 6: Package Exports and Event Types

**Files:**
- Create: `packages/appraisal/src/index.ts`
- Create: `packages/appraisal/src/events/AppraisalEventTypes.ts`

**Step 1: Create event types**

Create `packages/appraisal/src/events/AppraisalEventTypes.ts`:

```typescript
export const AppraisalEventTypes = {
  COMPLETED: 'appraisal.completed',
} as const;

export interface AppraisalCompletedPayload {
  appraisalId: string;
  purchaseRequestId: string;
  totalOffer: number;
  bookCount: number;
}
```

**Step 2: Create package exports**

Create `packages/appraisal/src/index.ts`:

```typescript
// Domain
export { Appraisal, AppraisalStatus } from './domain/Appraisal.js';
export { AppraisedBook, Condition, CONDITION_MULTIPLIERS } from './domain/AppraisedBook.js';

// Services
export { AppraisalService } from './services/AppraisalService.js';

// Infrastructure
export {
  BookLookupService,
  BookInfo,
  MockBookLookupService,
} from './infrastructure/BookLookupService.js';

// API
export { createAppraisalRoutes } from './api/routes.js';

// Events
export { AppraisalEventTypes, AppraisalCompletedPayload } from './events/AppraisalEventTypes.js';
```

**Step 3: Run all tests**

Run: `npm test -w packages/appraisal`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/appraisal/src/index.ts packages/appraisal/src/events
git commit -m "feat(appraisal): add package exports and event types"
```

---

## Task 7: Register Package in Workspace

**Files:**
- Modify: `package.json` (root)

**Step 1: Verify workspace registration**

The root package.json should already have `"packages/*"` in workspaces. Run:

```bash
npm install
```

**Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass (including new appraisal tests)

**Step 3: Commit if any changes**

```bash
git add package.json package-lock.json
git commit -m "chore: register appraisal package in workspace"
```
