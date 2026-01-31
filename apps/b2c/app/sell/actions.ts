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
