export class HashedPassword {
  constructor(
    public readonly hash: string,
    public readonly salt: string
  ) {
    if (!hash) {
      throw new Error('Password hash cannot be empty');
    }
    if (!salt) {
      throw new Error('Password salt cannot be empty');
    }
  }

  equals(other: HashedPassword): boolean {
    return this.hash === other.hash && this.salt === other.salt;
  }
}
