# B2C Storefront Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js customer storefront with a single-page sell flow where users enter box count and contact info to get a free shipping label.

**Architecture:** Next.js 14 App Router with Server Actions calling the @valuebooks/purchase-intake package directly. shadcn/ui components for the form UI. No separate API layer needed.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, @valuebooks/purchase-intake

---

## Task 1: Scaffold Next.js App

**Files:**
- Create: `apps/b2c/package.json`
- Create: `apps/b2c/tsconfig.json`
- Create: `apps/b2c/next.config.js`
- Create: `apps/b2c/tailwind.config.ts`
- Create: `apps/b2c/postcss.config.js`
- Create: `apps/b2c/app/globals.css`
- Create: `apps/b2c/app/layout.tsx`
- Create: `apps/b2c/app/page.tsx`
- Modify: `package.json` (root - add apps/* to workspaces)

**Step 1: Update root package.json workspaces**

Add `apps/*` to workspaces if not already present (it should be there).

**Step 2: Create apps/b2c/package.json**

```json
{
  "name": "@valuebooks/b2c",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "@valuebooks/purchase-intake": "*",
    "@valuebooks/shared": "*",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Step 3: Create apps/b2c/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: Create apps/b2c/next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@valuebooks/purchase-intake', '@valuebooks/shared'],
};

module.exports = nextConfig;
```

**Step 5: Create apps/b2c/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

**Step 6: Create apps/b2c/postcss.config.js**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 7: Create apps/b2c/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 8: Create apps/b2c/app/layout.tsx**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ValueBooks - Sell Your Books',
  description: 'Get paid for your used books with free shipping',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
```

**Step 9: Create apps/b2c/app/page.tsx**

```tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">ValueBooks</h1>
      <p className="text-xl text-gray-600 mb-8">Turn your used books into cash</p>
      <Link
        href="/sell"
        className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700"
      >
        Sell Your Books
      </Link>
    </main>
  );
}
```

**Step 10: Install dependencies**

Run: `npm install`
Expected: Dependencies installed for all workspaces

**Step 11: Verify app starts**

Run: `npm run dev -w @valuebooks/b2c`
Expected: Next.js starts on http://localhost:3001

**Step 12: Commit**

```bash
git add apps/ package.json
git commit -m "feat(b2c): scaffold Next.js app with Tailwind CSS"
```

---

## Task 2: Add shadcn/ui Components

**Files:**
- Create: `apps/b2c/lib/utils.ts`
- Create: `apps/b2c/components/ui/button.tsx`
- Create: `apps/b2c/components/ui/input.tsx`
- Create: `apps/b2c/components/ui/label.tsx`
- Create: `apps/b2c/components/ui/card.tsx`

**Step 1: Create apps/b2c/lib/utils.ts**

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 2: Create apps/b2c/components/ui/button.tsx**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
  size?: 'default' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          variant === 'default' && 'bg-blue-600 text-white hover:bg-blue-700',
          variant === 'outline' && 'border border-gray-300 bg-white hover:bg-gray-50',
          size === 'default' && 'h-10 px-4 py-2',
          size === 'lg' && 'h-12 px-8 text-lg',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
```

**Step 3: Create apps/b2c/components/ui/input.tsx**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
          'placeholder:text-gray-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
```

**Step 4: Create apps/b2c/components/ui/label.tsx**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )}
    {...props}
  />
));
Label.displayName = 'Label';

export { Label };
```

**Step 5: Create apps/b2c/components/ui/card.tsx**

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-lg border border-gray-200 bg-white shadow-sm', className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };
```

**Step 6: Commit**

```bash
git add apps/b2c/lib/ apps/b2c/components/
git commit -m "feat(b2c): add shadcn/ui components (button, input, label, card)"
```

---

## Task 3: Create Server Action

**Files:**
- Create: `apps/b2c/app/sell/actions.ts`

**Step 1: Create apps/b2c/app/sell/actions.ts**

```typescript
'use server';

import {
  PurchaseRequestService,
  EstimationService,
  MockCarrierAdapter,
  BookCategory,
  BookCondition,
} from '@valuebooks/purchase-intake';
import { EventBus } from '@valuebooks/shared';

export interface SubmissionResult {
  success: true;
  id: string;
  trackingNumber: string;
  labelUrl: string;
}

export interface SubmissionError {
  success: false;
  error: string;
}

export type SubmissionResponse = SubmissionResult | SubmissionError;

export async function createSubmission(formData: {
  boxCount: number;
  email: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}): Promise<SubmissionResponse> {
  try {
    const eventBus = new EventBus();
    const service = new PurchaseRequestService(
      eventBus,
      new EstimationService(),
      new MockCarrierAdapter()
    );

    const request = await service.create(
      {
        email: formData.email,
        name: formData.name,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
        },
      },
      {
        quantity: formData.boxCount,
        category: BookCategory.Mixed,
        condition: BookCondition.Mixed,
      }
    );

    const submitted = await service.submit(request.id);

    return {
      success: true,
      id: submitted.id,
      trackingNumber: submitted.shipment?.trackingNumber || '',
      labelUrl: submitted.shipment?.labelUrl || '',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

**Step 2: Commit**

```bash
git add apps/b2c/app/sell/
git commit -m "feat(b2c): add createSubmission server action"
```

---

## Task 4: Create Sell Form Component

**Files:**
- Create: `apps/b2c/components/sell-form.tsx`

**Step 1: Create apps/b2c/components/sell-form.tsx**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { createSubmission, SubmissionResponse } from '@/app/sell/actions';

interface ConfirmationData {
  trackingNumber: string;
  labelUrl: string;
}

export function SellForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const result: SubmissionResponse = await createSubmission({
      boxCount: Number(formData.get('boxCount')),
      email: formData.get('email') as string,
      name: formData.get('name') as string,
      street: formData.get('street') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zip: formData.get('zip') as string,
    });

    setIsSubmitting(false);

    if (result.success) {
      setConfirmation({
        trackingNumber: result.trackingNumber,
        labelUrl: result.labelUrl,
      });
    } else {
      setError(result.error);
    }
  }

  if (confirmation) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-green-600">Success!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">Your shipping label is ready.</p>

          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">Tracking Number</p>
            <p className="font-mono font-semibold">{confirmation.trackingNumber}</p>
          </div>

          <a
            href={confirmation.labelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button size="lg" className="w-full">
              Download Shipping Label
            </Button>
          </a>

          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-semibold">What happens next:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Pack your books in boxes</li>
              <li>Attach the shipping label</li>
              <li>Drop off at any carrier location</li>
              <li>We'll email your offer within 3-5 days of receipt</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sell Your Books</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="boxCount">How many boxes are you sending?</Label>
            <Input
              id="boxCount"
              name="boxCount"
              type="number"
              min="1"
              max="10"
              required
              placeholder="1"
            />
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium">Your Information</p>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                name="street"
                type="text"
                required
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-6 gap-2">
              <div className="col-span-3 space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  type="text"
                  required
                  placeholder="Boston"
                />
              </div>
              <div className="col-span-1 space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  type="text"
                  required
                  maxLength={2}
                  placeholder="MA"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  name="zip"
                  type="text"
                  required
                  placeholder="02101"
                />
              </div>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Get Free Shipping Label'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add apps/b2c/components/sell-form.tsx
git commit -m "feat(b2c): add SellForm component with confirmation state"
```

---

## Task 5: Create Sell Page

**Files:**
- Create: `apps/b2c/app/sell/page.tsx`

**Step 1: Create apps/b2c/app/sell/page.tsx**

```tsx
import { SellForm } from '@/components/sell-form';

export default function SellPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">ValueBooks</h1>
        <p className="text-gray-600">Free shipping. Fast payment.</p>
      </div>
      <SellForm />
    </main>
  );
}
```

**Step 2: Verify the flow works**

Run: `npm run dev -w @valuebooks/b2c`
Test manually:
1. Go to http://localhost:3001
2. Click "Sell Your Books"
3. Fill in form: 2 boxes, test@example.com, Test User, 123 Main St, Boston, MA, 02101
4. Click "Get Free Shipping Label"
5. Should see confirmation with tracking number and label download link

**Step 3: Commit**

```bash
git add apps/b2c/app/sell/page.tsx
git commit -m "feat(b2c): add sell page with form"
```

---

## Task 6: Add Basic Tests

**Files:**
- Create: `apps/b2c/app/sell/actions.test.ts`

**Step 1: Create apps/b2c/app/sell/actions.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { createSubmission } from './actions';

describe('createSubmission', () => {
  it('should create a submission and return tracking info', async () => {
    const result = await createSubmission({
      boxCount: 2,
      email: 'test@example.com',
      name: 'Test User',
      street: '123 Main St',
      city: 'Boston',
      state: 'MA',
      zip: '02101',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBeDefined();
      expect(result.trackingNumber).toContain('MOCK');
      expect(result.labelUrl).toContain('http');
    }
  });

  it('should reject invalid box count', async () => {
    const result = await createSubmission({
      boxCount: 0,
      email: 'test@example.com',
      name: 'Test User',
      street: '123 Main St',
      city: 'Boston',
      state: 'MA',
      zip: '02101',
    });

    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run tests**

Run: `npm run test`
Expected: All tests pass (20 existing + 2 new = 22 total)

**Step 3: Commit**

```bash
git add apps/b2c/app/sell/actions.test.ts
git commit -m "test(b2c): add server action tests"
```

---

## Task 7: Final Integration Test

**Files:**
- None (manual verification)

**Step 1: Start the app**

Run: `npm run dev -w @valuebooks/b2c`

**Step 2: Test the complete flow**

1. Visit http://localhost:3001
2. Click "Sell Your Books"
3. Enter: 3 boxes, your email, name, address
4. Submit
5. Verify: See confirmation with tracking number and label link

**Step 3: Run all tests**

Run: `npm run test`
Expected: All tests pass

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(b2c): complete sell flow implementation"
```

---

## Summary

After completing all tasks:
- **7 commits** on `feature/b2c-storefront` branch
- **~22 tests** (20 existing + 2 new)
- **Complete sell flow**: Home → Sell page → Form → Confirmation with shipping label
- **Integrated** with @valuebooks/purchase-intake via Server Actions
