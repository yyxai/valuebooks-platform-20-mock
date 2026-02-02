import { User } from '../domain/User.js';
import { UserRepository } from './UserRepository.js';

export class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.users.set(user.id.value, user);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.value === normalizedEmail) {
        return user;
      }
    }
    return null;
  }

  async findByAuthProviderExternalId(
    provider: string,
    externalId: string
  ): Promise<User | null> {
    for (const user of this.users.values()) {
      if (
        user.authProvider.type === provider &&
        user.authProvider.externalId === externalId
      ) {
        return user;
      }
    }
    return null;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  // Test helper methods
  clear(): void {
    this.users.clear();
  }

  size(): number {
    return this.users.size;
  }
}
