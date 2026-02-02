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
