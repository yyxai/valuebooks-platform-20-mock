# Sell Page Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the B2C sell page with pickup scheduling, ソクフリ option, coupon/recycle codes, and Japanese address format.

**Architecture:** Frontend-first approach - update the form UI and server action, then extend the domain model as needed. Postal code lookup uses external API (zipcloud).

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, Server Actions

---

## Task 1: Create Select Component

**Files:**
- Create: `apps/b2c/components/ui/select.tsx`

**Step 1: Create select component**

```typescript
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export { Select };
```

**Step 2: Commit**

```bash
git add apps/b2c/components/ui/select.tsx
git commit -m "feat(b2c): add Select component"
```

---

## Task 2: Create ソクフリ Selector Component

**Files:**
- Create: `apps/b2c/components/sokufuri-selector.tsx`

**Step 1: Create component**

```typescript
'use client';

import { cn } from '@/lib/utils';

interface SokufuriSelectorProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function SokufuriSelector({ value, onChange }: SokufuriSelectorProps) {
  return (
    <div className="space-y-2">
      <div
        className={cn(
          'border rounded-lg p-4 cursor-pointer transition-colors',
          !value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        )}
        onClick={() => onChange(false)}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center',
              !value ? 'border-blue-500' : 'border-gray-300'
            )}
          >
            {!value && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
          </div>
          <div>
            <p className="font-medium">通常買取</p>
            <p className="text-sm text-gray-600">査定 → 確認 → 入金</p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'border rounded-lg p-4 cursor-pointer transition-colors',
          value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        )}
        onClick={() => onChange(true)}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center',
              value ? 'border-blue-500' : 'border-gray-300'
            )}
          >
            {value && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
          </div>
          <div className="flex-1">
            <p className="font-medium">ソクフリ買取</p>
            <p className="text-sm text-gray-600">査定 → 即入金</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                ✓ 査定額+20%（ポイント付与）
              </span>
              <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                ✓ 最短翌日入金
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/b2c/components/sokufuri-selector.tsx
git commit -m "feat(b2c): add SokufuriSelector component"
```

---

## Task 3: Create Postal Code Hook

**Files:**
- Create: `apps/b2c/hooks/use-postal-code.ts`

**Step 1: Create hook**

```typescript
'use client';

import { useState, useCallback } from 'react';

interface PostalCodeResult {
  prefecture: string;
  city: string;
}

export function usePostalCode() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (postalCode: string): Promise<PostalCodeResult | null> => {
    // Remove hyphens and validate format
    const cleaned = postalCode.replace(/-/g, '');
    if (!/^\d{7}$/.test(cleaned)) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          prefecture: result.address1,
          city: result.address2 + result.address3,
        };
      } else {
        setError('郵便番号が見つかりませんでした');
        return null;
      }
    } catch {
      setError('住所の取得に失敗しました');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { lookup, isLoading, error };
}
```

**Step 2: Commit**

```bash
git add apps/b2c/hooks/use-postal-code.ts
git commit -m "feat(b2c): add usePostalCode hook for zipcloud API"
```

---

## Task 4: Update Domain - Customer Interface

**Files:**
- Modify: `packages/purchase-intake/src/domain/Customer.ts`

**Step 1: Update Customer and Address interfaces**

```typescript
export interface Customer {
  email: string;
  name: string;
  address: Address;
  phone: string;
}

export interface Address {
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  building?: string;
}
```

**Step 2: Commit**

```bash
git add packages/purchase-intake/src/domain/Customer.ts
git commit -m "feat(purchase-intake): update Customer with Japanese address format"
```

---

## Task 5: Update Domain - PurchaseRequest with New Fields

**Files:**
- Modify: `packages/purchase-intake/src/domain/PurchaseRequest.ts`

**Step 1: Add new fields to PurchaseRequest class**

Add after line 24 (after `public payment?: Payment;`):

```typescript
  public pickupDate?: string;
  public pickupTimeSlot?: string;
  public useSokufuri: boolean = false;
  public couponCode?: string;
  public recycleCode?: string;
```

**Step 2: Update constructor to accept new fields**

Update the `create` static method to accept optional params:

```typescript
  static create(
    customer: Customer,
    boxDescription: BoxDescription,
    options?: {
      pickupDate?: string;
      pickupTimeSlot?: string;
      useSokufuri?: boolean;
      couponCode?: string;
      recycleCode?: string;
    }
  ): PurchaseRequest {
    const id = crypto.randomUUID();
    const request = new PurchaseRequest(id, customer, boxDescription);
    if (options) {
      request.pickupDate = options.pickupDate;
      request.pickupTimeSlot = options.pickupTimeSlot;
      request.useSokufuri = options.useSokufuri ?? false;
      request.couponCode = options.couponCode;
      request.recycleCode = options.recycleCode;
    }
    return request;
  }
```

**Step 3: Commit**

```bash
git add packages/purchase-intake/src/domain/PurchaseRequest.ts
git commit -m "feat(purchase-intake): add pickup scheduling and sokufuri fields"
```

---

## Task 6: Update PurchaseRequestService

**Files:**
- Modify: `packages/purchase-intake/src/services/PurchaseRequestService.ts`

**Step 1: Find the create method and update its signature**

Update the `create` method to pass options through:

```typescript
  async create(
    customerData: {
      email: string;
      name: string;
      phone: string;
      address: {
        postalCode: string;
        prefecture: string;
        city: string;
        street: string;
        building?: string;
      };
    },
    boxData: {
      quantity: number;
      category: BookCategory;
      condition: BookCondition;
    },
    options?: {
      pickupDate?: string;
      pickupTimeSlot?: string;
      useSokufuri?: boolean;
      couponCode?: string;
      recycleCode?: string;
    }
  ): Promise<PurchaseRequest> {
    const customer: Customer = {
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone,
      address: customerData.address,
    };

    const boxDescription = BoxDescription.create(
      boxData.quantity,
      boxData.category,
      boxData.condition
    );

    const request = PurchaseRequest.create(customer, boxDescription, options);

    this.eventBus.publish({
      type: 'PurchaseRequestCreated',
      payload: { id: request.id, customerId: customer.email },
      timestamp: new Date(),
    });

    return request;
  }
```

**Step 2: Commit**

```bash
git add packages/purchase-intake/src/services/PurchaseRequestService.ts
git commit -m "feat(purchase-intake): update service to handle new fields"
```

---

## Task 7: Update Server Action

**Files:**
- Modify: `apps/b2c/app/sell/actions.ts`

**Step 1: Update the createSubmission function**

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
  pickupDate: string;
  pickupTimeSlot: string;
  useSokufuri: boolean;
}

export interface SubmissionError {
  success: false;
  error: string;
}

export type SubmissionResponse = SubmissionResult | SubmissionError;

export async function createSubmission(formData: {
  boxCount: number;
  pickupDate: string;
  pickupTimeSlot: string;
  useSokufuri: boolean;
  couponCode?: string;
  recycleCode?: string;
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  building?: string;
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
        phone: formData.phone,
        address: {
          postalCode: formData.postalCode,
          prefecture: formData.prefecture,
          city: formData.city,
          street: formData.street,
          building: formData.building,
        },
      },
      {
        quantity: formData.boxCount,
        category: BookCategory.Mixed,
        condition: BookCondition.Mixed,
      },
      {
        pickupDate: formData.pickupDate,
        pickupTimeSlot: formData.pickupTimeSlot,
        useSokufuri: formData.useSokufuri,
        couponCode: formData.couponCode,
        recycleCode: formData.recycleCode,
      }
    );

    const submitted = await service.submit(request.id);

    return {
      success: true,
      id: submitted.id,
      trackingNumber: submitted.shipment?.trackingNumber || '',
      labelUrl: submitted.shipment?.labelUrl || '',
      pickupDate: formData.pickupDate,
      pickupTimeSlot: formData.pickupTimeSlot,
      useSokufuri: formData.useSokufuri,
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
git add apps/b2c/app/sell/actions.ts
git commit -m "feat(b2c): update createSubmission with new fields"
```

---

## Task 8: Update Sell Form Component

**Files:**
- Modify: `apps/b2c/components/sell-form.tsx`

**Step 1: Replace the entire sell-form.tsx**

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SokufuriSelector } from '@/components/sokufuri-selector';
import { usePostalCode } from '@/hooks/use-postal-code';
import { createSubmission, SubmissionResponse } from '@/app/sell/actions';

interface ConfirmationData {
  trackingNumber: string;
  labelUrl: string;
  pickupDate: string;
  pickupTimeSlot: string;
  useSokufuri: boolean;
}

const TIME_SLOTS = [
  { value: '09:00-12:00', label: '9:00-12:00（午前中）' },
  { value: '12:00-15:00', label: '12:00-15:00' },
  { value: '15:00-18:00', label: '15:00-18:00' },
  { value: '18:00-21:00', label: '18:00-21:00' },
];

function getMinDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];
  return `${year}年${month}月${day}日（${dayOfWeek}）`;
}

export function SellForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);
  const [useSokufuri, setUseSokufuri] = useState(false);
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const { lookup, isLoading: isLookingUp } = usePostalCode();

  async function handlePostalCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const postalCode = e.target.value;
    if (postalCode.replace(/-/g, '').length === 7) {
      const result = await lookup(postalCode);
      if (result) {
        setPrefecture(result.prefecture);
        setCity(result.city);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const result: SubmissionResponse = await createSubmission({
      boxCount: Number(formData.get('boxCount')),
      pickupDate: formData.get('pickupDate') as string,
      pickupTimeSlot: formData.get('pickupTimeSlot') as string,
      useSokufuri,
      couponCode: (formData.get('couponCode') as string) || undefined,
      recycleCode: (formData.get('recycleCode') as string) || undefined,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      postalCode: formData.get('postalCode') as string,
      prefecture: formData.get('prefecture') as string,
      city: formData.get('city') as string,
      street: formData.get('street') as string,
      building: (formData.get('building') as string) || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      setConfirmation({
        trackingNumber: result.trackingNumber,
        labelUrl: result.labelUrl,
        pickupDate: result.pickupDate,
        pickupTimeSlot: result.pickupTimeSlot,
        useSokufuri: result.useSokufuri,
      });
    } else {
      setError(result.error);
    }
  }

  if (confirmation) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-green-600">✓ お申し込み完了</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">集荷予定</p>
            <p className="font-semibold">
              {formatDate(confirmation.pickupDate)} {confirmation.pickupTimeSlot}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">伝票番号</p>
            <p className="font-mono font-semibold">{confirmation.trackingNumber}</p>
          </div>

          <a
            href={confirmation.labelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button size="lg" className="w-full">
              送り状をダウンロード
            </Button>
          </a>

          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-gray-600">
              選択プラン: {confirmation.useSokufuri ? 'ソクフリ買取' : '通常買取'}
            </p>
            {confirmation.useSokufuri && (
              <p className="text-sm text-green-600">（査定額+20%ポイント付与）</p>
            )}
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-semibold">次のステップ:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>本を箱に詰めてください</li>
              <li>集荷日に配達員にお渡しください</li>
              <li>査定完了後、メールでご連絡します</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>本を売る</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Section 1: Boxes & Pickup */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">箱数・集荷</p>

            <div className="space-y-2">
              <Label htmlFor="boxCount">箱数</Label>
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

            <div className="space-y-2">
              <Label htmlFor="pickupDate">集荷希望日</Label>
              <Input
                id="pickupDate"
                name="pickupDate"
                type="date"
                min={getMinDate()}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickupTimeSlot">集荷希望時間帯</Label>
              <Select id="pickupTimeSlot" name="pickupTimeSlot" required>
                <option value="">選択してください</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Section 2: Sokufuri */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">買取方法</p>
            <SokufuriSelector value={useSokufuri} onChange={setUseSokufuri} />
          </div>

          {/* Section 3: Codes */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">コード入力（任意）</p>

            <div className="space-y-2">
              <Label htmlFor="couponCode">クーポンコード</Label>
              <Input
                id="couponCode"
                name="couponCode"
                type="text"
                placeholder="お持ちの場合は入力"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recycleCode">リサイクルコード</Label>
              <Input
                id="recycleCode"
                name="recycleCode"
                type="text"
                placeholder="お持ちの場合は入力"
              />
              <p className="text-xs text-gray-500">
                ValueBooksで購入した本を売る場合
              </p>
            </div>
          </div>

          {/* Section 4: Customer Info */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">お客様情報</p>

            <div className="space-y-2">
              <Label htmlFor="name">お名前</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="山田 太郎"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="example@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                placeholder="090-1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">郵便番号</Label>
              <Input
                id="postalCode"
                name="postalCode"
                type="text"
                required
                placeholder="100-0001"
                onChange={handlePostalCodeChange}
                maxLength={8}
              />
              {isLookingUp && (
                <p className="text-xs text-gray-500">住所を検索中...</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="prefecture">都道府県</Label>
                <Input
                  id="prefecture"
                  name="prefecture"
                  type="text"
                  required
                  placeholder="東京都"
                  value={prefecture}
                  onChange={(e) => setPrefecture(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">市区町村</Label>
                <Input
                  id="city"
                  name="city"
                  type="text"
                  required
                  placeholder="千代田区"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">番地</Label>
              <Input
                id="street"
                name="street"
                type="text"
                required
                placeholder="丸の内1-1-1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="building">建物名・部屋番号</Label>
              <Input
                id="building"
                name="building"
                type="text"
                placeholder="〇〇マンション 101号室"
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '送信中...' : '申し込む'}
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
git commit -m "feat(b2c): update SellForm with Japanese UI and new fields"
```

---

## Task 9: Update Sell Page Title

**Files:**
- Modify: `apps/b2c/app/sell/page.tsx`

**Step 1: Update the page with Japanese text**

```typescript
import { SellForm } from '@/components/sell-form';

export default function SellPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">ValueBooks</h1>
        <p className="text-gray-600">送料無料・スピード入金</p>
      </div>
      <SellForm />
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add apps/b2c/app/sell/page.tsx
git commit -m "feat(b2c): update sell page with Japanese tagline"
```

---

## Task 10: Fix TypeScript Errors and Test

**Step 1: Run typecheck**

Run: `npm run typecheck`

Fix any TypeScript errors that arise from the changes.

**Step 2: Run tests**

Run: `npm run test`

If tests fail due to interface changes, update the test files.

**Step 3: Manual test**

Run: `npm run dev -w apps/b2c`

1. Open http://localhost:4001/sell
2. Test postal code auto-lookup
3. Test ソクフリ toggle
4. Submit form and verify confirmation

**Step 4: Final commit**

```bash
git add .
git commit -m "fix(b2c): resolve typecheck and test issues"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Select component | select.tsx |
| 2 | SokufuriSelector | sokufuri-selector.tsx |
| 3 | PostalCode hook | use-postal-code.ts |
| 4 | Update Customer interface | Customer.ts |
| 5 | Update PurchaseRequest | PurchaseRequest.ts |
| 6 | Update Service | PurchaseRequestService.ts |
| 7 | Update Server Action | actions.ts |
| 8 | Update Sell Form | sell-form.tsx |
| 9 | Update Sell Page | page.tsx |
| 10 | Fix and Test | Various |

Total: 10 tasks
