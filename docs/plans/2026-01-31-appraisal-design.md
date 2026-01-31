# Appraisal Domain Design

## Overview

The Appraisal domain evaluates books received through Purchase Intake and generates offers. Staff scan each book by ISBN, the system looks up book info and calculates an offer based on condition, then emits the final offer back to Purchase Intake.

## Workflow

```
[PurchaseRequestReceived Event]
    → Create Appraisal (status: pending)
    → Staff scans books one by one (ISBN lookup via Open Library)
    → Staff selects condition for each book
    → System calculates offer per book (base price × condition multiplier)
    → Staff completes appraisal
    → System emits AppraisalCompleted event with total offer
    → Purchase Intake handles customer notification
```

**Key constraint:** Per-book ISBN scanning - accurate valuation, builds inventory data for future use.

## Domain Model

### Core Entities

```
Appraisal (Aggregate Root)
├── id: UUID
├── purchaseRequestId: UUID
├── status: Pending | InProgress | Completed
├── books: AppraisedBook[]
├── totalOffer: number (calculated)
└── completedAt: Date | null

AppraisedBook (Value Object)
├── isbn: string
├── title: string
├── author: string
├── condition: Excellent | Good | Fair | Poor
├── basePrice: number
└── offerPrice: number (basePrice × conditionMultiplier)
```

### Condition Multipliers

| Condition | Multiplier | Description |
|-----------|------------|-------------|
| Excellent | 80% | Like new, no wear |
| Good | 60% | Minor wear, fully functional |
| Fair | 40% | Noticeable wear, readable |
| Poor | 10% | Heavy wear, damaged |

### Offer Calculation

```
offerPrice = basePrice × conditionMultiplier
totalOffer = sum(books.map(b => b.offerPrice))
```

## Services

### BookLookupService

```typescript
interface BookLookupService {
  lookupByIsbn(isbn: string): Promise<{
    title: string;
    author: string;
    basePrice: number; // Default $10 for MVP
  } | null>;
}
```

**Implementation:** Uses Open Library API (`https://openlibrary.org/isbn/{isbn}.json`)

### AppraisalService

```typescript
interface AppraisalService {
  create(purchaseRequestId: string): Promise<Appraisal>;
  addBook(appraisalId: string, isbn: string, condition: Condition): Promise<Appraisal>;
  removeBook(appraisalId: string, isbn: string): Promise<Appraisal>;
  complete(appraisalId: string): Promise<Appraisal>; // Emits AppraisalCompleted
}
```

## API Endpoints (Hono)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/appraisals` | Create appraisal for a PurchaseRequest |
| GET | `/appraisals/:id` | Get appraisal details |
| POST | `/appraisals/:id/books` | Add scanned book |
| DELETE | `/appraisals/:id/books/:isbn` | Remove book |
| POST | `/appraisals/:id/complete` | Finalize and emit event |

## Events

### Consumed

- `PurchaseRequestReceived` - From Purchase Intake, triggers appraisal creation

### Emitted

- `AppraisalCompleted` - Contains `{ purchaseRequestId, totalOffer, bookCount }`

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Book lookup | Open Library API | Free, comprehensive ISBN data, no API key needed |
| Pricing model | Condition multipliers on base price | Simple, transparent, easy to adjust |
| Base price source | Hardcoded default ($10) for MVP | Later: internal database with market prices |
| Scanning interface | API-first | Supports future b2e Electron app with barcode scanner |
| Offer calculation | Sum of individual book offers | Clear breakdown for customer |
| Appraisal scope | One appraisal per PurchaseRequest | 1:1 mapping, simple lifecycle |

## Future Enhancements (not MVP)

- Internal book database with historical prices
- Barcode scanner integration in b2e Electron app
- Bulk ISBN import
- Price adjustment rules (demand, rarity)
