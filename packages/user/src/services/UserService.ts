import { EventBus } from '@valuebooks/shared';
import { User } from '../domain/User.js';
import { UserProfile } from '../domain/value-objects/UserProfile.js';
import { UserStatus, UserStatusValue } from '../domain/UserStatus.js';
import { UserEventTypes } from '../domain/events/index.js';
import { UserRepository } from '../infrastructure/UserRepository.js';
import { hashPassword, verifyPassword } from '../infrastructure/password.js';

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface UserSearchCriteria {
  email?: string;
  userType?: string;
  status?: UserStatusValue;
  page?: number;
  pageSize?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async getById(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }

  async getByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let profile = user.profile;

    if (input.name !== undefined) {
      profile = profile.withName(input.name);
    }
    if (input.phone !== undefined) {
      profile = profile.withPhone(input.phone || undefined);
    }

    user.updateProfile(profile);
    await this.userRepository.save(user);

    this.eventBus.publish({
      type: UserEventTypes.PROFILE_UPDATED,
      payload: {
        userId: user.id.value,
        name: user.profile.name,
        phone: user.profile.phone,
      },
      timestamp: new Date(),
    });

    return user;
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.password) {
      throw new Error('Cannot change password for OAuth users');
    }

    const isValid = await verifyPassword(input.currentPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const newHashedPassword = await hashPassword(input.newPassword);
    user.updatePassword(newHashedPassword);
    await this.userRepository.save(user);

    this.eventBus.publish({
      type: UserEventTypes.PASSWORD_RESET,
      payload: {
        userId: user.id.value,
        email: user.email.value,
      },
      timestamp: new Date(),
    });
  }

  async changeStatus(
    userId: string,
    newStatus: UserStatusValue,
    reason?: string,
    changedBy?: string
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const previousStatus = user.status;

    switch (newStatus) {
      case UserStatus.ACTIVE:
        if (previousStatus === UserStatus.PENDING_VERIFICATION) {
          user.verify();
        } else if (previousStatus === UserStatus.SUSPENDED) {
          user.reactivate();
        } else {
          throw new Error(`Cannot change status from ${previousStatus} to ${newStatus}`);
        }
        break;
      case UserStatus.SUSPENDED:
        user.suspend(reason);
        break;
      case UserStatus.DEACTIVATED:
        user.deactivate();
        break;
      default:
        throw new Error(`Invalid status: ${newStatus}`);
    }

    await this.userRepository.save(user);

    this.eventBus.publish({
      type: UserEventTypes.STATUS_CHANGED,
      payload: {
        userId: user.id.value,
        previousStatus,
        newStatus: user.status,
        reason,
      },
      timestamp: new Date(),
    });

    return user;
  }

  async listUsers(criteria: UserSearchCriteria): Promise<SearchResult<User>> {
    const page = criteria.page ?? 1;
    const pageSize = criteria.pageSize ?? 20;

    let users = await this.userRepository.findAll();

    // Apply filters
    if (criteria.email) {
      const emailLower = criteria.email.toLowerCase();
      users = users.filter((u) =>
        u.email.value.toLowerCase().includes(emailLower)
      );
    }

    if (criteria.userType) {
      users = users.filter((u) => u.userType === criteria.userType);
    }

    if (criteria.status) {
      users = users.filter((u) => u.status === criteria.status);
    }

    // Sort by createdAt descending
    users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = users.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const items = users.slice(startIndex, startIndex + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.delete(userId);
  }
}
