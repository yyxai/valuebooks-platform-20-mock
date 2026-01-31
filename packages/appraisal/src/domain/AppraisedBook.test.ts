import { describe, it, expect } from 'vitest';
import { AppraisedBook, Condition, CONDITION_MULTIPLIERS } from './AppraisedBook.js';

describe('Condition', () => {
  it('has correct multipliers', () => {
    expect(CONDITION_MULTIPLIERS[Condition.Excellent]).toBe(0.8);
    expect(CONDITION_MULTIPLIERS[Condition.Good]).toBe(0.6);
    expect(CONDITION_MULTIPLIERS[Condition.Fair]).toBe(0.4);
    expect(CONDITION_MULTIPLIERS[Condition.Poor]).toBe(0.1);
  });
});

describe('AppraisedBook', () => {
  it('calculates offer price from base price and condition', () => {
    const book = new AppraisedBook(
      '978-0-13-468599-1',
      'Clean Code',
      'Robert C. Martin',
      Condition.Good,
      10.00
    );

    expect(book.offerPrice).toBe(6.00); // 10 * 0.6
  });

  it('rounds offer price to 2 decimal places', () => {
    const book = new AppraisedBook(
      '978-0-13-468599-1',
      'Clean Code',
      'Robert C. Martin',
      Condition.Excellent,
      9.99
    );

    expect(book.offerPrice).toBe(7.99); // 9.99 * 0.8 = 7.992 → 7.99
  });
});
