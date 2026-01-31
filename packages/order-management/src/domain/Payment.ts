import { Money } from './Money.js';

export enum PaymentMethod {
  CreditCard = 'credit_card',
  PayPal = 'paypal',
  StoreCredit = 'store_credit',
}

export enum PaymentStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
  Refunded = 'refunded',
}

export interface CreatePaymentProps {
  method: PaymentMethod;
  amount: Money;
}

export interface ReconstructPaymentProps extends CreatePaymentProps {
  transactionId?: string;
  processedAt?: Date;
  status: PaymentStatus;
}

export class Payment {
  readonly method: PaymentMethod;
  readonly amount: Money;
  readonly transactionId?: string;
  readonly processedAt?: Date;
  readonly status: PaymentStatus;

  private constructor(
    method: PaymentMethod,
    amount: Money,
    status: PaymentStatus,
    transactionId?: string,
    processedAt?: Date
  ) {
    this.method = method;
    this.amount = amount;
    this.status = status;
    this.transactionId = transactionId;
    this.processedAt = processedAt;
  }

  static create(props: CreatePaymentProps): Payment {
    return new Payment(props.method, props.amount, PaymentStatus.Pending);
  }

  static reconstruct(props: ReconstructPaymentProps): Payment {
    return new Payment(
      props.method,
      props.amount,
      props.status,
      props.transactionId,
      props.processedAt
    );
  }

  complete(transactionId: string): Payment {
    if (this.status !== PaymentStatus.Pending) {
      throw new Error('Can only complete pending payments');
    }
    return new Payment(
      this.method,
      this.amount,
      PaymentStatus.Completed,
      transactionId,
      new Date()
    );
  }

  fail(): Payment {
    if (this.status !== PaymentStatus.Pending) {
      throw new Error('Can only fail pending payments');
    }
    return new Payment(
      this.method,
      this.amount,
      PaymentStatus.Failed,
      undefined,
      new Date()
    );
  }

  refund(): Payment {
    if (this.status !== PaymentStatus.Completed) {
      throw new Error('Can only refund completed payments');
    }
    return new Payment(
      this.method,
      this.amount,
      PaymentStatus.Refunded,
      this.transactionId,
      this.processedAt
    );
  }

  toJSON() {
    return {
      method: this.method,
      amountCents: this.amount.amount,
      currency: this.amount.currency,
      transactionId: this.transactionId,
      processedAt: this.processedAt,
      status: this.status,
    };
  }
}
