const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class UserId {
  constructor(public readonly value: string) {
    if (!value || !UUID_REGEX.test(value)) {
      throw new Error('UserId must be a valid UUID');
    }
  }

  static generate(): UserId {
    return new UserId(crypto.randomUUID());
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
