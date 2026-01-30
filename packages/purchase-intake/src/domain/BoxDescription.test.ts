import { describe, it, expect } from 'vitest';
import { BoxDescription, BookCategory, BookCondition } from './BoxDescription.js';

describe('BoxDescription', () => {
  it('should create valid box description', () => {
    const box = new BoxDescription(20, BookCategory.Fiction, BookCondition.Good);

    expect(box.quantity).toBe(20);
    expect(box.category).toBe(BookCategory.Fiction);
    expect(box.condition).toBe(BookCondition.Good);
  });

  it('should reject quantity less than 1', () => {
    expect(() => new BoxDescription(0, BookCategory.Fiction, BookCondition.Good))
      .toThrow('Quantity must be at least 1');
  });

  it('should reject quantity greater than 100', () => {
    expect(() => new BoxDescription(101, BookCategory.Fiction, BookCondition.Good))
      .toThrow('Quantity cannot exceed 100');
  });
});
