import { describe, it, expect } from 'vitest';
import { Money } from './Money.js';

describe('Money', () => {
  describe('creation', () => {
    it('should create money with amount and default USD currency', () => {
      const money = new Money(1000);
      expect(money.amount).toBe(1000);
      expect(money.currency).toBe('USD');
    });

    it('should create money with specified currency', () => {
      const money = new Money(500, 'EUR');
      expect(money.amount).toBe(500);
      expect(money.currency).toBe('EUR');
    });

    it('should throw error for negative amount', () => {
      expect(() => new Money(-100)).toThrow('Amount cannot be negative');
    });

    it('should throw error for non-integer amount', () => {
      expect(() => new Money(10.5)).toThrow('Amount must be an integer (cents)');
    });

    it('should allow zero amount', () => {
      const money = new Money(0);
      expect(money.amount).toBe(0);
    });
  });

  describe('fromDollars', () => {
    it('should create money from dollar amount', () => {
      const money = Money.fromDollars(10.99);
      expect(money.amount).toBe(1099);
      expect(money.currency).toBe('USD');
    });

    it('should handle whole dollar amounts', () => {
      const money = Money.fromDollars(5);
      expect(money.amount).toBe(500);
    });

    it('should round to nearest cent', () => {
      const money = Money.fromDollars(10.999);
      expect(money.amount).toBe(1100);
    });
  });

  describe('toDollars', () => {
    it('should convert cents to dollars', () => {
      const money = new Money(1099);
      expect(money.toDollars()).toBe(10.99);
    });

    it('should handle zero', () => {
      const money = new Money(0);
      expect(money.toDollars()).toBe(0);
    });
  });

  describe('arithmetic operations', () => {
    it('should add two money values with same currency', () => {
      const a = new Money(1000);
      const b = new Money(500);
      const result = a.add(b);
      expect(result.amount).toBe(1500);
      expect(result.currency).toBe('USD');
    });

    it('should throw when adding different currencies', () => {
      const usd = new Money(1000, 'USD');
      const eur = new Money(500, 'EUR');
      expect(() => usd.add(eur)).toThrow('Cannot add different currencies');
    });

    it('should subtract money values', () => {
      const a = new Money(1000);
      const b = new Money(300);
      const result = a.subtract(b);
      expect(result.amount).toBe(700);
    });

    it('should throw when subtracting different currencies', () => {
      const usd = new Money(1000, 'USD');
      const eur = new Money(500, 'EUR');
      expect(() => usd.subtract(eur)).toThrow('Cannot subtract different currencies');
    });

    it('should throw when subtraction would result in negative', () => {
      const a = new Money(300);
      const b = new Money(500);
      expect(() => a.subtract(b)).toThrow('Result cannot be negative');
    });

    it('should multiply by a factor', () => {
      const money = new Money(1000);
      const result = money.multiply(1.5);
      expect(result.amount).toBe(1500);
    });

    it('should round multiplication result', () => {
      const money = new Money(100);
      const result = money.multiply(1.555);
      expect(result.amount).toBe(156);
    });

    it('should throw when multiplying by negative factor', () => {
      const money = new Money(1000);
      expect(() => money.multiply(-1)).toThrow('Factor cannot be negative');
    });
  });

  describe('comparison', () => {
    it('should check equality', () => {
      const a = new Money(1000);
      const b = new Money(1000);
      const c = new Money(500);
      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it('should return false for different currencies', () => {
      const usd = new Money(1000, 'USD');
      const eur = new Money(1000, 'EUR');
      expect(usd.equals(eur)).toBe(false);
    });

    it('should compare greater than', () => {
      const a = new Money(1000);
      const b = new Money(500);
      expect(a.greaterThan(b)).toBe(true);
      expect(b.greaterThan(a)).toBe(false);
    });

    it('should compare less than', () => {
      const a = new Money(500);
      const b = new Money(1000);
      expect(a.lessThan(b)).toBe(true);
      expect(b.lessThan(a)).toBe(false);
    });
  });

  describe('formatting', () => {
    it('should format as string', () => {
      const money = new Money(1099);
      expect(money.toString()).toBe('$10.99');
    });

    it('should format whole dollars', () => {
      const money = new Money(1000);
      expect(money.toString()).toBe('$10.00');
    });

    it('should format cents only', () => {
      const money = new Money(99);
      expect(money.toString()).toBe('$0.99');
    });
  });
});
