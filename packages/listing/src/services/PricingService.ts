import { Money } from '../domain/Money.js';
import { BookCondition } from '../domain/BookCondition.js';

export class PricingService {
  private readonly markupByCondition: Record<BookCondition, number> = {
    [BookCondition.Excellent]: 0.60,
    [BookCondition.Good]: 0.50,
    [BookCondition.Fair]: 0.40,
    [BookCondition.Poor]: 0.30,
  };

  calculateListingPrice(offerPrice: Money, condition: BookCondition): Money {
    const markup = this.getMarkupPercentage(condition);
    return offerPrice.multiply(1 + markup);
  }

  calculateBulkDiscount(totalItems: number): number {
    if (totalItems <= 2) {
      return 0;
    }
    if (totalItems <= 5) {
      return 0.05;
    }
    if (totalItems <= 10) {
      return 0.10;
    }
    return 0.15;
  }

  getMarkupPercentage(condition: BookCondition): number {
    return this.markupByCondition[condition];
  }
}
