import { describe, it, expect, beforeEach } from 'vitest';
import { PricingService } from './PricingService.js';
import { Money } from '../domain/Money.js';
import { BookCondition } from '../domain/BookCondition.js';

describe('PricingService', () => {
  let pricingService: PricingService;

  beforeEach(() => {
    pricingService = new PricingService();
  });

  describe('calculateListingPrice', () => {
    it('should apply 50% markup by default', () => {
      const offerPrice = Money.fromDollars(6);
      const listingPrice = pricingService.calculateListingPrice(
        offerPrice,
        BookCondition.Good
      );

      expect(listingPrice.toDollars()).toBe(9);
    });

    it('should apply higher markup for excellent condition', () => {
      const offerPrice = Money.fromDollars(10);
      const listingPrice = pricingService.calculateListingPrice(
        offerPrice,
        BookCondition.Excellent
      );

      // Excellent gets 60% markup
      expect(listingPrice.toDollars()).toBe(16);
    });

    it('should apply lower markup for fair condition', () => {
      const offerPrice = Money.fromDollars(10);
      const listingPrice = pricingService.calculateListingPrice(
        offerPrice,
        BookCondition.Fair
      );

      // Fair gets 40% markup
      expect(listingPrice.toDollars()).toBe(14);
    });

    it('should apply lowest markup for poor condition', () => {
      const offerPrice = Money.fromDollars(10);
      const listingPrice = pricingService.calculateListingPrice(
        offerPrice,
        BookCondition.Poor
      );

      // Poor gets 30% markup
      expect(listingPrice.toDollars()).toBe(13);
    });

    it('should handle small amounts correctly', () => {
      const offerPrice = Money.fromDollars(1);
      const listingPrice = pricingService.calculateListingPrice(
        offerPrice,
        BookCondition.Good
      );

      expect(listingPrice.toDollars()).toBe(1.5);
    });

    it('should preserve currency', () => {
      const offerPrice = new Money(1000, 'EUR');
      const listingPrice = pricingService.calculateListingPrice(
        offerPrice,
        BookCondition.Good
      );

      expect(listingPrice.currency).toBe('EUR');
    });
  });

  describe('calculateBulkDiscount', () => {
    it('should return 0% discount for 1 item', () => {
      expect(pricingService.calculateBulkDiscount(1)).toBe(0);
    });

    it('should return 0% discount for up to 2 items', () => {
      expect(pricingService.calculateBulkDiscount(2)).toBe(0);
    });

    it('should return 5% discount for 3-5 items', () => {
      expect(pricingService.calculateBulkDiscount(3)).toBe(0.05);
      expect(pricingService.calculateBulkDiscount(5)).toBe(0.05);
    });

    it('should return 10% discount for 6-10 items', () => {
      expect(pricingService.calculateBulkDiscount(6)).toBe(0.10);
      expect(pricingService.calculateBulkDiscount(10)).toBe(0.10);
    });

    it('should return 15% discount for more than 10 items', () => {
      expect(pricingService.calculateBulkDiscount(11)).toBe(0.15);
      expect(pricingService.calculateBulkDiscount(50)).toBe(0.15);
    });
  });

  describe('getMarkupPercentage', () => {
    it('should return condition-based markup percentages', () => {
      expect(pricingService.getMarkupPercentage(BookCondition.Excellent)).toBe(0.60);
      expect(pricingService.getMarkupPercentage(BookCondition.Good)).toBe(0.50);
      expect(pricingService.getMarkupPercentage(BookCondition.Fair)).toBe(0.40);
      expect(pricingService.getMarkupPercentage(BookCondition.Poor)).toBe(0.30);
    });
  });
});
