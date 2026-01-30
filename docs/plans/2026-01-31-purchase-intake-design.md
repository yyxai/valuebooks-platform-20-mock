# Purchase Intake Domain Design

## Overview

The Purchase Intake domain handles the workflow of purchasing used books from customers. It accepts box-level submissions (not individual books), arranges prepaid shipping, tracks arrival, and processes payment after appraisal.

## Customer Journey

### Submission Flow
1. Customer describes their box: estimated quantity, category (fiction, textbooks, etc.), and rough condition (mostly good, some wear, mixed)
2. System calculates an **estimate range** (e.g., "$25-40") based on category and condition multipliers
3. Customer provides shipping address and contact info
4. System generates a **prepaid shipping label** (PDF + carrier barcode)
5. Customer receives confirmation email with label and instructions

### Pre-Shipment Period
- Customer can **add more books** to the submission before shipping (updates estimate)
- Proactive notifications at milestones: label created, reminder if not shipped within X days
- Once shipped, tracking updates via email/SMS: in transit, out for delivery, delivered

**Key constraint:** No ISBN lookup or per-book entry at submission - just rough descriptions to keep friction low.

## Arrival & Handoff

### Intake Verification (Warehouse)
1. Box arrives, staff scans tracking barcode to pull up the PurchaseRequest
2. Staff performs quick verification:
   - Box condition (damaged in transit?)
   - Rough quantity check (not empty, roughly matches estimate)
   - Contents are actually books (not random items)
3. If issues found → Flag for review, customer contacted
4. If verified → Status updated to "Received", queued for Appraisal domain

### Customer Notification
- Email/SMS: "Your books have arrived! We'll send your final offer within [X] business days."

### Handoff to Appraisal
- Purchase Intake emits a `PurchaseRequestReceived` event
- Appraisal domain picks it up and begins evaluation
- Purchase Intake doesn't know appraisal details - just waits for the result

**Key principle:** Purchase Intake owns the request lifecycle but delegates valuation entirely to Appraisal.

## Offer & Payment

### Receiving Appraisal Result
- Appraisal domain emits `AppraisalCompleted` event with final offer amount
- Purchase Intake compares final offer to original estimate range

### Auto-Accept Path (offer within estimate)
1. System automatically accepts on customer's behalf
2. Customer notified: "Great news! Your books were valued at $35 - within your estimate. Payment processing."
3. Proceeds to payment

### Review Path (offer below estimate)
1. Customer notified: "Your final offer is $18 (estimate was $25-40). Accept or return?"
2. Customer has X days to decide via email link or account
3. **Accept** → Proceeds to payment
4. **Reject** → All books queued for return shipment (ValueBooks covers return shipping)
5. **No response** → Auto-reject after deadline, books returned

### Payment
- Customer chooses: Direct deposit (ACH) or Store credit (+10% bonus)
- Payment preference can be set at submission or at acceptance
- Funds transferred within 3-5 business days

## Domain Model

### Core Entities

```
PurchaseRequest (Aggregate Root)
├── id: UUID
├── status: Draft | Submitted | Shipped | Received | AwaitingDecision | Accepted | Rejected | Completed
├── customer: { email, name, address, phone }
├── estimate: { low: number, high: number, lockedUntil: Date }
├── boxDescription: { quantity: number, category: string, condition: string }
├── shipment: { trackingNumber, carrier, labelUrl, shippedAt, deliveredAt }
├── offer: { amount: number, decidedAt: Date, decision: Accept | Reject }
├── payment: { method: ACH | StoreCredit, amount: number, processedAt: Date }
└── timestamps: { createdAt, updatedAt }
```

### Domain Events (emitted)
- `PurchaseRequestSubmitted` - triggers label generation
- `PurchaseRequestShipped` - carrier tracking detected movement
- `PurchaseRequestReceived` - warehouse verified receipt → Appraisal picks this up
- `PurchaseRequestAccepted` - payment should be processed
- `PurchaseRequestRejected` - return shipment should be scheduled

### Domain Events (consumed)
- `AppraisalCompleted` - from Appraisal domain, contains final offer

## Services & Integrations

### Internal Services

```
EstimationService
├── calculateEstimate(boxDescription) → { low, high }
└── Uses category/condition multipliers (configurable)

PurchaseRequestService
├── create(), submit(), addBooks(), accept(), reject()
└── Orchestrates state transitions and emits events

NotificationService
├── sendEmail(), sendSMS()
└── Triggered by status changes (may be shared across domains)
```

### External Integrations

```
CarrierAdapter (interface)
├── generateLabel(address) → { trackingNumber, labelUrl }
├── getTrackingStatus(trackingNumber) → TrackingEvent[]
└── scheduleReturn(trackingNumber) → returnLabelUrl

Implementations: UPSAdapter, FedExAdapter, USPSAdapter
```

### API Endpoints (Hono)
- `POST /purchase-requests` - create new request
- `PATCH /purchase-requests/:id` - add books, update details
- `POST /purchase-requests/:id/submit` - finalize and get label
- `POST /purchase-requests/:id/decision` - accept or reject offer
- `GET /purchase-requests/:id` - status and details

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Submission granularity | Box-level, not per-book | Reduces friction for customers with many books |
| Estimate info collected | Quantity + category + condition | Balances accuracy with simplicity |
| Shipping cost | ValueBooks covers all shipping | Removes customer hesitation |
| Customer updates | Proactive email/SMS + add books before ship | Better experience, encourages larger submissions |
| Intake process | Staff verification before appraisal | Catches issues early (damaged, empty, wrong items) |
| Offer acceptance | Auto-accept if within estimate | Faster payment, less friction for happy path |
| Rejection handling | Full return, no partial | Keeps it simple, clear customer expectation |
| Payment options | ACH or store credit (+10% bonus) | Flexibility with retention incentive |
