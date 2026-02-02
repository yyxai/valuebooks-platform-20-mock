import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@valuebooks/shared';
import { UserService } from './UserService.js';
import { InMemoryUserRepository } from '../infrastructure/InMemoryUserRepository.js';
import { User } from '../domain/User.js';
import { Email } from '../domain/value-objects/Email.js';
import { HashedPassword } from '../domain/value-objects/HashedPassword.js';
import { UserProfile } from '../domain/value-objects/UserProfile.js';
import { AuthProvider } from '../domain/value-objects/AuthProvider.js';
import { UserType } from '../domain/UserType.js';
import { UserStatus } from '../domain/UserStatus.js';
import { UserEventTypes } from '../domain/events/index.js';
import { hashPassword } from '../infrastructure/password.js';

describe('UserService', () => {
  let service: UserService;
  let userRepository: InMemoryUserRepository;
  let eventBus: EventBus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let publishSpy: any;
  let testUser: User;

  const createTestUser = async (email = 'user@example.com') => {
    const hashedPassword = await hashPassword('ValidPass123');
    const user = User.create({
      email: new Email(email),
      password: hashedPassword,
      userType: UserType.CONSUMER,
      authProvider: AuthProvider.email(),
      profile: new UserProfile({ name: 'Test User', phone: '123' }),
    });
    user.verify(); // Make user active
    await userRepository.save(user);
    return user;
  };

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    eventBus = new EventBus();
    publishSpy = vi.spyOn(eventBus, 'publish');

    service = new UserService(userRepository, eventBus);
    testUser = await createTestUser();
  });

  describe('getById', () => {
    it('should return user by ID', async () => {
      const user = await service.getById(testUser.id.value);

      expect(user).not.toBeNull();
      expect(user?.id.value).toBe(testUser.id.value);
    });

    it('should return null for non-existent ID', async () => {
      const user = await service.getById('non-existent');

      expect(user).toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('should return user by email', async () => {
      const user = await service.getByEmail('user@example.com');

      expect(user).not.toBeNull();
      expect(user?.email.value).toBe('user@example.com');
    });

    it('should return null for non-existent email', async () => {
      const user = await service.getByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update user name', async () => {
      const updatedUser = await service.updateProfile(testUser.id.value, {
        name: 'New Name',
      });

      expect(updatedUser.profile.name).toBe('New Name');
      expect(updatedUser.profile.phone).toBe('123'); // Unchanged
    });

    it('should update user phone', async () => {
      const updatedUser = await service.updateProfile(testUser.id.value, {
        phone: '456',
      });

      expect(updatedUser.profile.name).toBe('Test User'); // Unchanged
      expect(updatedUser.profile.phone).toBe('456');
    });

    it('should clear phone with empty string', async () => {
      const updatedUser = await service.updateProfile(testUser.id.value, {
        phone: '',
      });

      expect(updatedUser.profile.phone).toBeUndefined();
    });

    it('should publish ProfileUpdated event', async () => {
      await service.updateProfile(testUser.id.value, { name: 'New Name' });

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: UserEventTypes.PROFILE_UPDATED,
          payload: expect.objectContaining({
            userId: testUser.id.value,
            name: 'New Name',
          }),
        })
      );
    });

    it('should throw for non-existent user', async () => {
      await expect(
        service.updateProfile('non-existent', { name: 'New Name' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('changePassword', () => {
    it('should change password with correct current password', async () => {
      const originalHash = testUser.password?.hash;

      await service.changePassword(testUser.id.value, {
        currentPassword: 'ValidPass123',
        newPassword: 'NewValidPass456',
      });

      // Verify password hash changed
      const user = await userRepository.findById(testUser.id.value);
      expect(user?.password?.hash).not.toBe(originalHash);
    });

    it('should publish PasswordReset event', async () => {
      await service.changePassword(testUser.id.value, {
        currentPassword: 'ValidPass123',
        newPassword: 'NewValidPass456',
      });

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: UserEventTypes.PASSWORD_RESET,
        })
      );
    });

    it('should throw for incorrect current password', async () => {
      await expect(
        service.changePassword(testUser.id.value, {
          currentPassword: 'WrongPassword123',
          newPassword: 'NewValidPass456',
        })
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw for OAuth user', async () => {
      const oauthUser = User.create({
        email: new Email('oauth@example.com'),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: new UserProfile({ name: 'OAuth User' }),
      });
      await userRepository.save(oauthUser);

      await expect(
        service.changePassword(oauthUser.id.value, {
          currentPassword: 'anything',
          newPassword: 'NewValidPass456',
        })
      ).rejects.toThrow('Cannot change password for OAuth users');
    });
  });

  describe('changeStatus', () => {
    it('should suspend active user', async () => {
      const user = await service.changeStatus(
        testUser.id.value,
        UserStatus.SUSPENDED,
        'Violation of terms'
      );

      expect(user.status).toBe(UserStatus.SUSPENDED);
    });

    it('should reactivate suspended user', async () => {
      await service.changeStatus(testUser.id.value, UserStatus.SUSPENDED);

      const user = await service.changeStatus(
        testUser.id.value,
        UserStatus.ACTIVE
      );

      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('should deactivate user', async () => {
      const user = await service.changeStatus(
        testUser.id.value,
        UserStatus.DEACTIVATED
      );

      expect(user.status).toBe(UserStatus.DEACTIVATED);
    });

    it('should verify pending user', async () => {
      // Create pending user
      const hashedPassword = await hashPassword('ValidPass123');
      const pendingUser = User.create({
        email: new Email('pending@example.com'),
        password: hashedPassword,
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.email(),
        profile: new UserProfile({ name: 'Pending User' }),
      });
      await userRepository.save(pendingUser);

      const user = await service.changeStatus(
        pendingUser.id.value,
        UserStatus.ACTIVE
      );

      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('should publish StatusChanged event', async () => {
      await service.changeStatus(testUser.id.value, UserStatus.SUSPENDED);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: UserEventTypes.STATUS_CHANGED,
          payload: expect.objectContaining({
            userId: testUser.id.value,
            previousStatus: UserStatus.ACTIVE,
            newStatus: UserStatus.SUSPENDED,
          }),
        })
      );
    });

    it('should throw for non-existent user', async () => {
      await expect(
        service.changeStatus('non-existent', UserStatus.SUSPENDED)
      ).rejects.toThrow('User not found');
    });
  });

  describe('listUsers', () => {
    beforeEach(async () => {
      await createTestUser('user2@example.com');
      await createTestUser('user3@example.com');
    });

    it('should return all users', async () => {
      const result = await service.listUsers({});

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should filter by email', async () => {
      const result = await service.listUsers({ email: 'user2' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].email.value).toBe('user2@example.com');
    });

    it('should filter by status', async () => {
      await service.changeStatus(testUser.id.value, UserStatus.SUSPENDED);

      const result = await service.listUsers({ status: UserStatus.SUSPENDED });

      expect(result.items).toHaveLength(1);
    });

    it('should paginate results', async () => {
      const result = await service.listUsers({ page: 1, pageSize: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.totalPages).toBe(2);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      await service.deleteUser(testUser.id.value);

      const user = await userRepository.findById(testUser.id.value);
      expect(user).toBeNull();
    });

    it('should throw for non-existent user', async () => {
      await expect(service.deleteUser('non-existent')).rejects.toThrow(
        'User not found'
      );
    });
  });
});
