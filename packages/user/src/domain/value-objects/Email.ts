const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Company domains for employee email validation
const EMPLOYEE_DOMAINS = ['valuebooks.co.jp', 'valuebooks.com'];

export class Email {
  constructor(public readonly value: string) {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      throw new Error('Email cannot be empty');
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      throw new Error('Invalid email format');
    }
    this.value = trimmed;
  }

  getDomain(): string {
    return this.value.split('@')[1];
  }

  isEmployeeDomain(): boolean {
    return EMPLOYEE_DOMAINS.includes(this.getDomain());
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
