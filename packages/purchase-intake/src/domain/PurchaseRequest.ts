import { PurchaseRequestStatus } from './PurchaseRequestStatus.js';
import { BoxDescription } from './BoxDescription.js';
import { Estimate } from './Estimate.js';
import { Customer } from './Customer.js';

export interface Shipment {
  trackingNumber: string;
  carrier: string;
  labelUrl: string;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface Offer {
  amount: number;
  decidedAt?: Date;
  decision?: 'accept' | 'reject';
}

export interface Payment {
  method: 'ach' | 'store_credit';
  amount: number;
  processedAt?: Date;
}

export class PurchaseRequest {
  public readonly id: string;
  public status: PurchaseRequestStatus;
  public readonly customer: Customer;
  public boxDescription: BoxDescription;
  public estimate?: Estimate;
  public shipment?: Shipment;
  public offer?: Offer;
  public payment?: Payment;
  public pickupDate?: string;
  public pickupTimeSlot?: string;
  public useSokufuri: boolean = false;
  public couponCode?: string;
  public recycleCode?: string;
  public readonly createdAt: Date;
  public updatedAt: Date;

  private constructor(id: string, customer: Customer, boxDescription: BoxDescription) {
    this.id = id;
    this.customer = customer;
    this.boxDescription = boxDescription;
    this.status = PurchaseRequestStatus.Draft;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

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

  submit(estimate: Estimate, trackingNumber: string, labelUrl: string): void {
    if (this.status !== PurchaseRequestStatus.Draft) {
      throw new Error(`Cannot submit: current status is ${this.status}`);
    }
    this.estimate = estimate;
    this.shipment = { trackingNumber, carrier: 'ups', labelUrl };
    this.status = PurchaseRequestStatus.Submitted;
    this.updatedAt = new Date();
  }

  markShipped(): void {
    if (this.status !== PurchaseRequestStatus.Submitted) {
      throw new Error(`Cannot mark shipped: current status is ${this.status}`);
    }
    this.shipment!.shippedAt = new Date();
    this.status = PurchaseRequestStatus.Shipped;
    this.updatedAt = new Date();
  }

  markReceived(): void {
    if (this.status !== PurchaseRequestStatus.Shipped) {
      throw new Error(`Cannot mark received: current status is ${this.status}`);
    }
    this.shipment!.deliveredAt = new Date();
    this.status = PurchaseRequestStatus.Received;
    this.updatedAt = new Date();
  }

  setOffer(amount: number): void {
    if (this.status !== PurchaseRequestStatus.Received) {
      throw new Error(`Cannot set offer: current status is ${this.status}`);
    }
    this.offer = { amount };

    if (this.estimate?.isWithinRange(amount)) {
      this.accept();
    } else {
      this.status = PurchaseRequestStatus.AwaitingDecision;
    }
    this.updatedAt = new Date();
  }

  accept(): void {
    if (this.status !== PurchaseRequestStatus.AwaitingDecision &&
        this.status !== PurchaseRequestStatus.Received) {
      throw new Error(`Cannot accept: current status is ${this.status}`);
    }
    this.offer!.decision = 'accept';
    this.offer!.decidedAt = new Date();
    this.status = PurchaseRequestStatus.Accepted;
    this.updatedAt = new Date();
  }

  reject(): void {
    if (this.status !== PurchaseRequestStatus.AwaitingDecision) {
      throw new Error(`Cannot reject: current status is ${this.status}`);
    }
    this.offer!.decision = 'reject';
    this.offer!.decidedAt = new Date();
    this.status = PurchaseRequestStatus.Rejected;
    this.updatedAt = new Date();
  }

  processPayment(method: 'ach' | 'store_credit'): void {
    if (this.status !== PurchaseRequestStatus.Accepted) {
      throw new Error(`Cannot process payment: current status is ${this.status}`);
    }
    const amount = method === 'store_credit'
      ? this.offer!.amount * 1.10
      : this.offer!.amount;
    this.payment = { method, amount, processedAt: new Date() };
    this.status = PurchaseRequestStatus.Completed;
    this.updatedAt = new Date();
  }
}
