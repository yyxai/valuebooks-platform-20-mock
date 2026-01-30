export class Estimate {
  constructor(
    public readonly low: number,
    public readonly high: number,
    public readonly lockedUntil?: Date
  ) {
    if (low > high) throw new Error('Low estimate cannot exceed high estimate');
  }

  isWithinRange(amount: number): boolean {
    return amount >= this.low && amount <= this.high;
  }
}
