export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string = 'USD'
  ) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
    if (!Number.isInteger(amount)) {
      throw new Error('Amount must be an integer (cents)');
    }
  }

  static fromDollars(dollars: number, currency: string = 'USD'): Money {
    const cents = Math.round(dollars * 100);
    return new Money(cents, currency);
  }

  static zero(currency: string = 'USD'): Money {
    return new Money(0, currency);
  }

  toDollars(): number {
    return this.amount / 100;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot subtract different currencies');
    }
    if (this.amount < other.amount) {
      throw new Error('Result cannot be negative');
    }
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Factor cannot be negative');
    }
    const result = Math.round(this.amount * factor);
    return new Money(result, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  greaterThan(other: Money): boolean {
    return this.amount > other.amount;
  }

  lessThan(other: Money): boolean {
    return this.amount < other.amount;
  }

  toString(): string {
    const dollars = this.toDollars().toFixed(2);
    return `$${dollars}`;
  }
}
