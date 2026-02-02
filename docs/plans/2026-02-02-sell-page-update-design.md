# Sell Page Update Design

## Overview

Update the B2C sell page (`/sell`) to collect additional customer information for the book selling workflow.

## New Features

| Feature | Description |
|---------|-------------|
| Pickup scheduling | Date + time slot selection for carrier pickup |
| ソクフリ option | Fast payment option with +20% bonus (as points) |
| Coupon code | Optional promotional code |
| Recycle code | Loyalty code for customers reselling ValueBooks purchases |
| Japanese address | Full Japanese address format with postal code auto-lookup |
| Phone number | Required for carrier coordination |

## Form Structure

### Section 1: Boxes & Pickup

- **箱数** - Number input (1-10)
- **集荷希望日** - Date picker (tomorrow onwards)
- **集荷希望時間帯** - Dropdown:
  - 9:00-12:00（午前中）
  - 12:00-15:00
  - 15:00-18:00
  - 18:00-21:00

### Section 2: ソクフリ選択

Toggle comparison panel showing both options:

```
┌─────────────────────────────────────┐
│ ○ 通常買取                          │
│   査定 → 確認 → 入金                 │
├─────────────────────────────────────┤
│ ● ソクフリ買取                       │
│   査定 → 即入金                      │
│   ✓ 査定額+20%（ポイント付与）        │
│   ✓ 最短翌日入金                     │
└─────────────────────────────────────┘
```

### Section 3: コード入力 (Optional)

- **クーポンコード** - Text input
- **リサイクルコード** - Text input with helper: "ValueBooksで購入した本を売る場合"

### Section 4: お客様情報

| Field | Label | Required | Notes |
|-------|-------|----------|-------|
| name | お名前 | Yes | |
| email | メールアドレス | Yes | |
| phone | 電話番号 | Yes | Accepts 090-1234-5678 format |
| postalCode | 郵便番号 | Yes | Auto-fills prefecture/city |
| prefecture | 都道府県 | Yes | Auto-filled from postal code |
| city | 市区町村 | Yes | Auto-filled from postal code |
| street | 番地 | Yes | |
| building | 建物名・部屋番号 | No | |

## Confirmation Screen

After successful submission:

```
┌─────────────────────────────────────┐
│ ✓ お申し込み完了                     │
├─────────────────────────────────────┤
│ 集荷予定                            │
│ 2026年2月5日（水）15:00-18:00       │
├─────────────────────────────────────┤
│ 伝票番号                            │
│ 1234-5678-9012                     │
├─────────────────────────────────────┤
│ [  送り状をダウンロード  ]           │
├─────────────────────────────────────┤
│ 選択プラン: ソクフリ買取             │
│ (査定額+20%ポイント付与)             │
├─────────────────────────────────────┤
│ 次のステップ:                        │
│ 1. 本を箱に詰めてください            │
│ 2. 集荷日に配達員にお渡しください     │
│ 3. 査定完了後、メールでご連絡します   │
└─────────────────────────────────────┘
```

## Data Structure

```typescript
interface SellSubmission {
  // Boxes & Pickup
  boxCount: number;
  pickupDate: string;        // "2026-02-05"
  pickupTimeSlot: string;    // "15:00-18:00"

  // Options
  useSokufuri: boolean;
  couponCode?: string;
  recycleCode?: string;

  // Customer info
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  building?: string;
}
```

## Technical Implementation

### Postal Code API

Use zipcloud API (free, no key required):
```
https://zipcloud.ibsnet.co.jp/api/search?zipcode={postalCode}
```

Response auto-fills:
- `prefecture` from `address1`
- `city` from `address2` + `address3`

### Backend Updates

1. Update `createSubmission` action to accept new fields
2. Pass pickup date/time to carrier API
3. Store ソクフリ selection in PurchaseRequest entity
4. Validate coupon/recycle codes if provided

### Files to Modify

- `apps/b2c/components/sell-form.tsx` - Main form component
- `apps/b2c/app/sell/actions.ts` - Server action
- `packages/purchase-intake/src/domain/PurchaseRequest.ts` - Add new fields
- `packages/purchase-intake/src/services/PurchaseRequestService.ts` - Handle new options

### New Components

- `apps/b2c/components/ui/date-picker.tsx` - Date selection
- `apps/b2c/components/ui/time-slot-select.tsx` - Time slot dropdown
- `apps/b2c/components/sokufuri-selector.tsx` - ソクフリ toggle panel
