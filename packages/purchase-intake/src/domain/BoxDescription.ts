export enum BookCategory {
  Fiction = 'fiction',
  NonFiction = 'non-fiction',
  Textbooks = 'textbooks',
  Children = 'children',
  Mixed = 'mixed',
}

export enum BookCondition {
  Excellent = 'excellent',
  Good = 'good',
  Fair = 'fair',
  Mixed = 'mixed',
}

export class BoxDescription {
  constructor(
    public readonly quantity: number,
    public readonly category: BookCategory,
    public readonly condition: BookCondition
  ) {
    if (quantity < 1) throw new Error('Quantity must be at least 1');
    if (quantity > 100) throw new Error('Quantity cannot exceed 100');
  }
}
