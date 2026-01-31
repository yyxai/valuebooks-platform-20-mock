# B2C Storefront Design

## Overview

Customer-facing Next.js app for selling books to ValueBooks. Minimal MVP with a single-page submission flow.

## User Flow

```
[Enter Box Count] → [Enter Contact Info] → [Submit] → [Get Shipping Label]
```

**Steps:**
1. Customer lands on `/sell` page
2. Enters number of boxes they're sending
3. Enters shipping address and contact info (email, name, address)
4. Clicks "Get Free Shipping Label"
5. Confirmation shows: tracking number, downloadable label PDF, next steps

**No estimate shown upfront** - customer submits, ships boxes, then receives offer after appraisal via email.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **API**: Server Actions (direct service calls)
- **Package**: Consumes `@valuebooks/purchase-intake`

## Project Structure

```
apps/b2c/
├── app/
│   ├── layout.tsx          # Root layout with header/footer
│   ├── page.tsx            # Home page (links to /sell)
│   ├── sell/
│   │   ├── page.tsx        # Sell form page
│   │   └── actions.ts      # Server Actions (createSubmission)
│   └── globals.css         # Tailwind imports
├── components/
│   ├── sell-form.tsx       # Main form component (client)
│   ├── confirmation.tsx    # Success state with label download
│   └── ui/                 # shadcn components (button, input, card, etc.)
├── lib/
│   └── utils.ts            # cn() helper for Tailwind
├── tailwind.config.ts
├── next.config.js
└── package.json
```

## Server Action

```typescript
// app/sell/actions.ts
'use server'

import { PurchaseRequestService, EstimationService, MockCarrierAdapter } from '@valuebooks/purchase-intake';
import { EventBus } from '@valuebooks/shared';

export async function createSubmission(formData: {
  boxCount: number;
  email: string;
  name: string;
  address: { street: string; city: string; state: string; zip: string };
}) {
  const eventBus = new EventBus();
  const service = new PurchaseRequestService(
    eventBus,
    new EstimationService(),
    new MockCarrierAdapter()
  );

  const request = await service.create(
    { email: formData.email, name: formData.name, address: formData.address },
    { quantity: formData.boxCount, category: 'mixed', condition: 'mixed' }
  );

  const submitted = await service.submit(request.id);

  return {
    id: submitted.id,
    trackingNumber: submitted.shipment?.trackingNumber,
    labelUrl: submitted.shipment?.labelUrl,
  };
}
```

## Form UI

```
┌─────────────────────────────────────────┐
│  ValueBooks - Sell Your Books           │
├─────────────────────────────────────────┤
│                                         │
│  How many boxes are you sending?        │
│  ┌─────────────────────────────────┐    │
│  │ 2                               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Your Information                       │
│  ┌─────────────────────────────────┐    │
│  │ Email                           │    │
│  │ Name                            │    │
│  │ Street Address                  │    │
│  │ City, State, ZIP                │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     Get Free Shipping Label     │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

**shadcn/ui components:**
- Card - Form container
- Input - Text inputs
- Button - Submit button
- Label - Form labels

## Confirmation State

After successful submission:
- Success message with tracking number
- Download link for shipping label PDF
- "What happens next" instructions:
  1. Pack your books in boxes
  2. Attach the shipping label
  3. Drop off at any carrier location
  4. We'll email your offer within 3-5 days of receipt

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Form complexity | Single field (box count) | Minimal friction, details come from appraisal |
| Estimate display | None | Actual value determined after appraisal |
| API approach | Server Actions | Modern Next.js pattern, no separate API needed |
| Styling | shadcn/ui + Tailwind | Professional components out of the box |
| Account system | None (MVP) | Can add later, not needed for core flow |
