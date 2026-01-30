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
