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
