export interface UserProfileProps {
  name: string;
  phone?: string;
}

export class UserProfile {
  public readonly name: string;
  public readonly phone?: string;

  constructor(props: UserProfileProps) {
    const name = props.name.trim();
    if (!name) {
      throw new Error('Name cannot be empty');
    }
    if (name.length > 255) {
      throw new Error('Name cannot exceed 255 characters');
    }
    this.name = name;

    if (props.phone) {
      const phone = props.phone.trim();
      if (phone.length > 50) {
        throw new Error('Phone cannot exceed 50 characters');
      }
      this.phone = phone;
    }
  }

  withName(name: string): UserProfile {
    return new UserProfile({ name, phone: this.phone });
  }

  withPhone(phone?: string): UserProfile {
    return new UserProfile({ name: this.name, phone });
  }

  equals(other: UserProfile): boolean {
    return this.name === other.name && this.phone === other.phone;
  }
}
