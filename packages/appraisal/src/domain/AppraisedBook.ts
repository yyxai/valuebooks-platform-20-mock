export enum Condition {
  Excellent = 'excellent',
  Good = 'good',
  Fair = 'fair',
  Poor = 'poor',
}

export const CONDITION_MULTIPLIERS: Record<Condition, number> = {
  [Condition.Excellent]: 0.8,
  [Condition.Good]: 0.6,
  [Condition.Fair]: 0.4,
  [Condition.Poor]: 0.1,
};

export class AppraisedBook {
  public readonly offerPrice: number;

  constructor(
    public readonly isbn: string,
    public readonly title: string,
    public readonly author: string,
    public readonly condition: Condition,
    public readonly basePrice: number
  ) {
    const multiplier = CONDITION_MULTIPLIERS[condition];
    this.offerPrice = Math.round(basePrice * multiplier * 100) / 100;
  }
}
