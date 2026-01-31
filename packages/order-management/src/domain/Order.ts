import { OrderStatus } from './OrderStatus.js';
import { OrderLineItem, LineItemStatus } from './OrderLineItem.js';
import { Address } from './Address.js';
import { Money } from './Money.js';
import { Payment, PaymentMethod } from './Payment.js';
import { ShipmentTracking } from './ShipmentTracking.js';

export interface CreateOrderProps {
  customerId: string;
  shippingAddress: Address;
  billingAddress?: Address;
  tax?: Money;
  shipping?: Money;
}

export interface ReconstructOrderProps {
  id: string;
  customerId: string;
  shippingAddress: Address;
  billingAddress?: Address;
  lineItems: OrderLineItem[];
  status: OrderStatus;
  tax: Money;
  shipping: Money;
  payment?: Payment;
  shipmentTracking?: ShipmentTracking;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessPaymentInput {
  method: PaymentMethod;
  transactionId: string;
}

export class Order {
  readonly id: string;
  readonly customerId: string;
  readonly shippingAddress: Address;
  readonly billingAddress?: Address;
  readonly lineItems: ReadonlyArray<OrderLineItem>;
  readonly status: OrderStatus;
  readonly tax: Money;
  readonly shipping: Money;
  readonly payment?: Payment;
  readonly shipmentTracking?: ShipmentTracking;
  readonly cancelledAt?: Date;
  readonly cancelReason?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: {
    id: string;
    customerId: string;
    shippingAddress: Address;
    billingAddress?: Address;
    lineItems: OrderLineItem[];
    status: OrderStatus;
    tax: Money;
    shipping: Money;
    payment?: Payment;
    shipmentTracking?: ShipmentTracking;
    cancelledAt?: Date;
    cancelReason?: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.customerId = props.customerId;
    this.shippingAddress = props.shippingAddress;
    this.billingAddress = props.billingAddress;
    this.lineItems = props.lineItems;
    this.status = props.status;
    this.tax = props.tax;
    this.shipping = props.shipping;
    this.payment = props.payment;
    this.shipmentTracking = props.shipmentTracking;
    this.cancelledAt = props.cancelledAt;
    this.cancelReason = props.cancelReason;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreateOrderProps): Order {
    if (!props.customerId?.trim()) {
      throw new Error('Customer ID is required');
    }

    const now = new Date();
    return new Order({
      id: crypto.randomUUID(),
      customerId: props.customerId.trim(),
      shippingAddress: props.shippingAddress,
      billingAddress: props.billingAddress,
      lineItems: [],
      status: OrderStatus.Draft,
      tax: props.tax ?? Money.zero(),
      shipping: props.shipping ?? Money.zero(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: ReconstructOrderProps): Order {
    return new Order({
      id: props.id,
      customerId: props.customerId,
      shippingAddress: props.shippingAddress,
      billingAddress: props.billingAddress,
      lineItems: props.lineItems,
      status: props.status,
      tax: props.tax,
      shipping: props.shipping,
      payment: props.payment,
      shipmentTracking: props.shipmentTracking,
      cancelledAt: props.cancelledAt,
      cancelReason: props.cancelReason,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  get subtotal(): Money {
    return this.lineItems.reduce(
      (sum, item) => sum.add(item.price),
      Money.zero()
    );
  }

  get total(): Money {
    return this.subtotal.add(this.tax).add(this.shipping);
  }

  addLineItem(item: OrderLineItem): Order {
    if (this.status !== OrderStatus.Draft) {
      throw new Error('Can only add items to draft orders');
    }
    if (this.lineItems.some(existing => existing.listingId === item.listingId)) {
      throw new Error('Listing already in order');
    }

    return new Order({
      ...this.toProps(),
      lineItems: [...this.lineItems, item],
      updatedAt: new Date(),
    });
  }

  removeLineItem(listingId: string): Order {
    if (this.status !== OrderStatus.Draft) {
      throw new Error('Can only remove items from draft orders');
    }
    const index = this.lineItems.findIndex(item => item.listingId === listingId);
    if (index === -1) {
      throw new Error('Line item not found');
    }

    const newItems = [...this.lineItems];
    newItems.splice(index, 1);

    return new Order({
      ...this.toProps(),
      lineItems: newItems,
      updatedAt: new Date(),
    });
  }

  startCheckout(): Order {
    if (this.status !== OrderStatus.Draft) {
      throw new Error('Can only start checkout from draft');
    }
    if (this.lineItems.length === 0) {
      throw new Error('Cannot checkout empty order');
    }

    return new Order({
      ...this.toProps(),
      status: OrderStatus.CheckingOut,
      updatedAt: new Date(),
    });
  }

  confirmHoldings(heldListingIds: string[]): Order {
    if (this.status !== OrderStatus.CheckingOut) {
      throw new Error('Can only confirm holdings during checkout');
    }

    const allHeld = this.lineItems.every(item =>
      heldListingIds.includes(item.listingId)
    );
    if (!allHeld) {
      throw new Error('Not all listings held');
    }

    const updatedItems = this.lineItems.map(item => item.markHeld());

    return new Order({
      ...this.toProps(),
      lineItems: updatedItems,
      status: OrderStatus.PaymentPending,
      updatedAt: new Date(),
    });
  }

  processPayment(input: ProcessPaymentInput): Order {
    if (this.status !== OrderStatus.PaymentPending) {
      throw new Error('Can only process payment when payment is pending');
    }

    const payment = Payment.create({
      method: input.method,
      amount: this.total,
    }).complete(input.transactionId);

    const updatedItems = this.lineItems.map(item => item.markSold());

    return new Order({
      ...this.toProps(),
      lineItems: updatedItems,
      status: OrderStatus.Confirmed,
      payment,
      updatedAt: new Date(),
    });
  }

  ship(tracking: ShipmentTracking): Order {
    if (this.status !== OrderStatus.Confirmed) {
      throw new Error('Can only ship confirmed orders');
    }

    return new Order({
      ...this.toProps(),
      status: OrderStatus.Shipped,
      shipmentTracking: tracking,
      updatedAt: new Date(),
    });
  }

  markDelivered(): Order {
    if (this.status !== OrderStatus.Shipped) {
      throw new Error('Can only mark shipped orders as delivered');
    }

    const updatedTracking = this.shipmentTracking!.markDelivered();

    return new Order({
      ...this.toProps(),
      status: OrderStatus.Completed,
      shipmentTracking: updatedTracking,
      updatedAt: new Date(),
    });
  }

  cancel(reason?: string): Order {
    if (this.status === OrderStatus.Shipped || this.status === OrderStatus.Completed) {
      throw new Error('Cannot cancel shipped or completed orders');
    }
    if (this.status === OrderStatus.Cancelled) {
      throw new Error('Order is already cancelled');
    }

    // Release any held items
    const updatedItems = this.lineItems.map(item => {
      if (item.status === LineItemStatus.Held) {
        return item.release();
      }
      return item;
    });

    return new Order({
      ...this.toProps(),
      lineItems: updatedItems,
      status: OrderStatus.Cancelled,
      cancelledAt: new Date(),
      cancelReason: reason,
      updatedAt: new Date(),
    });
  }

  getHeldListingIds(): string[] {
    return this.lineItems
      .filter(item => item.status === LineItemStatus.Held)
      .map(item => item.listingId);
  }

  private toProps() {
    return {
      id: this.id,
      customerId: this.customerId,
      shippingAddress: this.shippingAddress,
      billingAddress: this.billingAddress,
      lineItems: [...this.lineItems],
      status: this.status,
      tax: this.tax,
      shipping: this.shipping,
      payment: this.payment,
      shipmentTracking: this.shipmentTracking,
      cancelledAt: this.cancelledAt,
      cancelReason: this.cancelReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
