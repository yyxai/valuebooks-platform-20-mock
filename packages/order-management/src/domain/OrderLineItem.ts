import { BookCondition } from './BookCondition.js';
import { Money } from './Money.js';

export enum LineItemStatus {
  Pending = 'pending',
  Held = 'held',
  Sold = 'sold',
  Released = 'released',
}

export interface CreateLineItemProps {
  listingId: string;
  isbn: string;
  title: string;
  author: string;
  condition: BookCondition;
  price: Money;
}

export interface ReconstructLineItemProps extends CreateLineItemProps {
  status: LineItemStatus;
}

export class OrderLineItem {
  readonly listingId: string;
  readonly isbn: string;
  readonly title: string;
  readonly author: string;
  readonly condition: BookCondition;
  readonly price: Money;
  readonly status: LineItemStatus;

  private constructor(
    listingId: string,
    isbn: string,
    title: string,
    author: string,
    condition: BookCondition,
    price: Money,
    status: LineItemStatus
  ) {
    this.listingId = listingId;
    this.isbn = isbn;
    this.title = title;
    this.author = author;
    this.condition = condition;
    this.price = price;
    this.status = status;
  }

  static create(props: CreateLineItemProps): OrderLineItem {
    if (!props.listingId?.trim()) {
      throw new Error('Listing ID is required');
    }
    if (!props.isbn?.trim()) {
      throw new Error('ISBN is required');
    }
    if (!props.title?.trim()) {
      throw new Error('Title is required');
    }
    if (!props.author?.trim()) {
      throw new Error('Author is required');
    }

    return new OrderLineItem(
      props.listingId.trim(),
      props.isbn.trim(),
      props.title.trim(),
      props.author.trim(),
      props.condition,
      props.price,
      LineItemStatus.Pending
    );
  }

  static reconstruct(props: ReconstructLineItemProps): OrderLineItem {
    return new OrderLineItem(
      props.listingId,
      props.isbn,
      props.title,
      props.author,
      props.condition,
      props.price,
      props.status
    );
  }

  markHeld(): OrderLineItem {
    if (this.status !== LineItemStatus.Pending) {
      throw new Error('Can only hold pending items');
    }
    return new OrderLineItem(
      this.listingId,
      this.isbn,
      this.title,
      this.author,
      this.condition,
      this.price,
      LineItemStatus.Held
    );
  }

  markSold(): OrderLineItem {
    if (this.status !== LineItemStatus.Held) {
      throw new Error('Can only mark held items as sold');
    }
    return new OrderLineItem(
      this.listingId,
      this.isbn,
      this.title,
      this.author,
      this.condition,
      this.price,
      LineItemStatus.Sold
    );
  }

  release(): OrderLineItem {
    if (this.status !== LineItemStatus.Held) {
      throw new Error('Can only release held items');
    }
    return new OrderLineItem(
      this.listingId,
      this.isbn,
      this.title,
      this.author,
      this.condition,
      this.price,
      LineItemStatus.Released
    );
  }

  toJSON() {
    return {
      listingId: this.listingId,
      isbn: this.isbn,
      title: this.title,
      author: this.author,
      condition: this.condition,
      priceAmount: this.price.amount,
      priceCurrency: this.price.currency,
      status: this.status,
    };
  }
}
