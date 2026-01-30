import { BoxDescription, BookCategory, BookCondition } from '../domain/BoxDescription.js';
import { Estimate } from '../domain/Estimate.js';

const CATEGORY_MULTIPLIERS: Record<BookCategory, number> = {
  [BookCategory.Fiction]: 1.0,
  [BookCategory.NonFiction]: 1.2,
  [BookCategory.Textbooks]: 2.5,
  [BookCategory.Children]: 0.8,
  [BookCategory.Mixed]: 1.0,
};

const CONDITION_MULTIPLIERS: Record<BookCondition, number> = {
  [BookCondition.Excellent]: 1.5,
  [BookCondition.Good]: 1.0,
  [BookCondition.Fair]: 0.5,
  [BookCondition.Mixed]: 0.7,
};

const BASE_PRICE_PER_BOOK = 1.50;
const ESTIMATE_VARIANCE = 0.3; // +/- 30%

export class EstimationService {
  calculateEstimate(box: BoxDescription): Estimate {
    const categoryMultiplier = CATEGORY_MULTIPLIERS[box.category];
    const conditionMultiplier = CONDITION_MULTIPLIERS[box.condition];

    const baseValue = box.quantity * BASE_PRICE_PER_BOOK * categoryMultiplier * conditionMultiplier;

    const low = Math.round(baseValue * (1 - ESTIMATE_VARIANCE));
    const high = Math.round(baseValue * (1 + ESTIMATE_VARIANCE));

    return new Estimate(low, high);
  }
}
