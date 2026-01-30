import { describe, it, expect } from 'vitest';
import { Estimate } from './Estimate.js';

describe('Estimate', () => {
  it('should create valid estimate with range', () => {
    const estimate = new Estimate(25, 40);

    expect(estimate.low).toBe(25);
    expect(estimate.high).toBe(40);
  });

  it('should reject when low is greater than high', () => {
    expect(() => new Estimate(50, 25)).toThrow('Low estimate cannot exceed high estimate');
  });

  it('should check if amount is within range', () => {
    const estimate = new Estimate(25, 40);

    expect(estimate.isWithinRange(30)).toBe(true);
    expect(estimate.isWithinRange(25)).toBe(true);
    expect(estimate.isWithinRange(40)).toBe(true);
    expect(estimate.isWithinRange(20)).toBe(false);
    expect(estimate.isWithinRange(45)).toBe(false);
  });
});
