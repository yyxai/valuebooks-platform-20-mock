// packages/purchase-intake/src/services/PurchaseRequestService.ts
import { EventBus } from '@valuebooks/shared';
import { PurchaseRequest } from '../domain/PurchaseRequest.js';
import { BoxDescription, BookCategory, BookCondition } from '../domain/BoxDescription.js';
import { Customer } from '../domain/Customer.js';
import { EstimationService } from './EstimationService.js';
import { CarrierAdapter } from '../infrastructure/CarrierAdapter.js';
import { PurchaseIntakeEventTypes } from '../domain/events/index.js';

export class PurchaseRequestService {
  private requests = new Map<string, PurchaseRequest>();

  constructor(
    private eventBus: EventBus,
    private estimationService: EstimationService,
    private carrierAdapter: CarrierAdapter
  ) {}

  async create(
    customer: Customer,
    boxData: { quantity: number; category: BookCategory; condition: BookCondition }
  ): Promise<PurchaseRequest> {
    const boxDescription = new BoxDescription(boxData.quantity, boxData.category, boxData.condition);
    const request = PurchaseRequest.create(customer, boxDescription);
    this.requests.set(request.id, request);
    return request;
  }

  async submit(requestId: string): Promise<PurchaseRequest> {
    const request = this.getRequest(requestId);
    const estimate = this.estimationService.calculateEstimate(request.boxDescription);
    const label = await this.carrierAdapter.generateLabel(request.customer.address);

    request.submit(estimate, label.trackingNumber, label.labelUrl);

    this.eventBus.publish({
      type: PurchaseIntakeEventTypes.SUBMITTED,
      payload: {
        requestId: request.id,
        customerId: request.customer.email,
        trackingNumber: label.trackingNumber,
      },
      timestamp: new Date(),
    });

    return request;
  }

  async markReceived(requestId: string): Promise<PurchaseRequest> {
    const request = this.getRequest(requestId);
    request.markShipped();
    request.markReceived();

    this.eventBus.publish({
      type: PurchaseIntakeEventTypes.RECEIVED,
      payload: {
        requestId: request.id,
        trackingNumber: request.shipment!.trackingNumber,
      },
      timestamp: new Date(),
    });

    return request;
  }

  async handleAppraisalCompleted(requestId: string, offerAmount: number): Promise<PurchaseRequest> {
    const request = this.getRequest(requestId);
    request.setOffer(offerAmount);
    return request;
  }

  async acceptOffer(requestId: string, paymentMethod: 'ach' | 'store_credit'): Promise<PurchaseRequest> {
    const request = this.getRequest(requestId);
    if (request.status === 'awaiting_decision') {
      request.accept();
    }
    request.processPayment(paymentMethod);

    this.eventBus.publish({
      type: PurchaseIntakeEventTypes.ACCEPTED,
      payload: {
        requestId: request.id,
        amount: request.payment!.amount,
        paymentMethod,
      },
      timestamp: new Date(),
    });

    return request;
  }

  async rejectOffer(requestId: string): Promise<PurchaseRequest> {
    const request = this.getRequest(requestId);
    request.reject();

    this.eventBus.publish({
      type: PurchaseIntakeEventTypes.REJECTED,
      payload: {
        requestId: request.id,
        trackingNumber: request.shipment!.trackingNumber,
      },
      timestamp: new Date(),
    });

    return request;
  }

  getRequest(requestId: string): PurchaseRequest {
    const request = this.requests.get(requestId);
    if (!request) throw new Error(`Purchase request not found: ${requestId}`);
    return request;
  }
}
