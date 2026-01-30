import { describe, it, expect } from 'vitest';
import { EstimationService } from './EstimationService.js';
import { BoxDescription, BookCategory, BookCondition } from '../domain/BoxDescription.js';

describe('EstimationService', () => {
  const service = new EstimationService();

  it('should calculate estimate for fiction books in good condition', () => {
    const box = new BoxDescription(20, BookCategory.Fiction, BookCondition.Good);
    const estimate = service.calculateEstimate(box);

    expect(estimate.low).toBeGreaterThan(0);
    expect(estimate.high).toBeGreaterThan(estimate.low);
  });

  it('should give higher estimate for textbooks', () => {
    const fiction = new BoxDescription(10, BookCategory.Fiction, BookCondition.Good);
    const textbooks = new BoxDescription(10, BookCategory.Textbooks, BookCondition.Good);

    const fictionEstimate = service.calculateEstimate(fiction);
    const textbookEstimate = service.calculateEstimate(textbooks);

    expect(textbookEstimate.low).toBeGreaterThan(fictionEstimate.low);
  });

  it('should give higher estimate for excellent condition', () => {
    const good = new BoxDescription(10, BookCategory.Fiction, BookCondition.Good);
    const excellent = new BoxDescription(10, BookCategory.Fiction, BookCondition.Excellent);

    const goodEstimate = service.calculateEstimate(good);
    const excellentEstimate = service.calculateEstimate(excellent);

    expect(excellentEstimate.low).toBeGreaterThan(goodEstimate.low);
  });
});
