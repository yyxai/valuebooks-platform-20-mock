import { ListingStatus } from './ListingStatus.js';
import { BookInfo } from './BookInfo.js';
import { Money } from './Money.js';

export interface CreateListingProps {
  bookInfo: BookInfo;
  sourceAppraisalId: string;
  purchaseRequestId: string;
  offerPrice: Money;
  listingPrice: Money;
}

export interface ReconstructListingProps {
  id: string;
  bookInfo: BookInfo;
  sourceAppraisalId: string;
  purchaseRequestId: string;
  status: ListingStatus;
  offerPrice: Money;
  listingPrice: Money;
  heldByOrderId?: string;
  heldUntil?: Date;
  soldAt?: Date;
  withdrawReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Listing {
  public readonly id: string;
  public readonly bookInfo: BookInfo;
  public readonly sourceAppraisalId: string;
  public readonly purchaseRequestId: string;
  public status: ListingStatus;
  public readonly offerPrice: Money;
  public readonly listingPrice: Money;
  public heldByOrderId?: string;
  public heldUntil?: Date;
  public soldAt?: Date;
  public withdrawReason?: string;
  public readonly createdAt: Date;
  public updatedAt: Date;

  private constructor(
    id: string,
    bookInfo: BookInfo,
    sourceAppraisalId: string,
    purchaseRequestId: string,
    status: ListingStatus,
    offerPrice: Money,
    listingPrice: Money,
    createdAt: Date,
    updatedAt: Date
  ) {
    this.id = id;
    this.bookInfo = bookInfo;
    this.sourceAppraisalId = sourceAppraisalId;
    this.purchaseRequestId = purchaseRequestId;
    this.status = status;
    this.offerPrice = offerPrice;
    this.listingPrice = listingPrice;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create(props: CreateListingProps): Listing {
    const id = crypto.randomUUID();
    const now = new Date();
    return new Listing(
      id,
      props.bookInfo,
      props.sourceAppraisalId,
      props.purchaseRequestId,
      ListingStatus.Available,
      props.offerPrice,
      props.listingPrice,
      now,
      now
    );
  }

  static reconstruct(props: ReconstructListingProps): Listing {
    const listing = new Listing(
      props.id,
      props.bookInfo,
      props.sourceAppraisalId,
      props.purchaseRequestId,
      props.status,
      props.offerPrice,
      props.listingPrice,
      props.createdAt,
      props.updatedAt
    );
    listing.heldByOrderId = props.heldByOrderId;
    listing.heldUntil = props.heldUntil;
    listing.soldAt = props.soldAt;
    listing.withdrawReason = props.withdrawReason;
    return listing;
  }

  hold(orderId: string, durationMinutes: number): void {
    if (this.status !== ListingStatus.Available) {
      throw new Error('Cannot hold: listing is not available');
    }

    this.heldByOrderId = orderId;
    this.heldUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    this.status = ListingStatus.Held;
    this.updatedAt = new Date();
  }

  release(): void {
    if (this.status !== ListingStatus.Held) {
      throw new Error('Cannot release: listing is not held');
    }

    this.heldByOrderId = undefined;
    this.heldUntil = undefined;
    this.status = ListingStatus.Available;
    this.updatedAt = new Date();
  }

  markSold(): void {
    if (this.status !== ListingStatus.Held) {
      throw new Error('Cannot mark sold: listing is not held');
    }

    this.soldAt = new Date();
    this.status = ListingStatus.Sold;
    this.updatedAt = new Date();
  }

  withdraw(reason?: string): void {
    if (this.status === ListingStatus.Sold) {
      throw new Error('Cannot withdraw: listing is sold');
    }
    if (this.status === ListingStatus.Withdrawn) {
      throw new Error('Cannot withdraw: listing is already withdrawn');
    }

    this.withdrawReason = reason;
    this.heldByOrderId = undefined;
    this.heldUntil = undefined;
    this.status = ListingStatus.Withdrawn;
    this.updatedAt = new Date();
  }

  isHoldExpired(): boolean {
    if (this.status !== ListingStatus.Held || !this.heldUntil) {
      return false;
    }
    return Date.now() > this.heldUntil.getTime();
  }
}
