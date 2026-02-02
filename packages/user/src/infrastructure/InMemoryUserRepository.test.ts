import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUserRepository } from './InMemoryUserRepository.js';
import { User } from '../domain/User.js';
import { Email } from '../domain/value-objects/Email.js';
import { HashedPassword } from '../domain/value-objects/HashedPassword.js';
import { UserProfile } from '../domain/value-objects/UserProfile.js';
import { AuthProvider } from '../domain/value-objects/AuthProvider.js';
import { UserType } from '../domain/UserType.js';

describe('InMemoryUserRepository', () => {
  let repository: InMemoryUserRepository;

  const createTestUser = (email = 'user@example.com') =>
    User.create({
      email: new Email(email),
      password: new HashedPassword('hash', 'salt'),
      userType: UserType.CONSUMER,
      authProvider: AuthProvider.email(),
      profile: new UserProfile({ name: 'Test User' }),
    });

  const createOAuthUser = (provider: string, externalId: string) =>
    User.create({
      email: new Email(`${externalId}@oauth.com`),
      userType: UserType.CONSUMER,
      authProvider:
        provider === 'google'
          ? AuthProvider.google(externalId)
          : AuthProvider.facebook(externalId),
      profile: new UserProfile({ name: 'OAuth User' }),
    });

  beforeEach(() => {
    repository = new InMemoryUserRepository();
  });

  describe('save', () => {
    it('should save a user', async () => {
      const user = createTestUser();

      await repository.save(user);

      expect(repository.size()).toBe(1);
    });

    it('should update existing user on save', async () => {
      const user = createTestUser();
      await repository.save(user);

      user.updateProfile(new UserProfile({ name: 'Updated Name' }));
      await repository.save(user);

      const found = await repository.findById(user.id.value);
      expect(found?.profile.name).toBe('Updated Name');
      expect(repository.size()).toBe(1);
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const user = createTestUser();
      await repository.save(user);

      const found = await repository.findById(user.id.value);

      expect(found).toBe(user);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = createTestUser('test@example.com');
      await repository.save(user);

      const found = await repository.findByEmail('test@example.com');

      expect(found).toBe(user);
    });

    it('should find user by email case-insensitively', async () => {
      const user = createTestUser('test@example.com');
      await repository.save(user);

      const found = await repository.findByEmail('TEST@EXAMPLE.COM');

      expect(found).toBe(user);
    });

    it('should return null for non-existent email', async () => {
      const found = await repository.findByEmail('nonexistent@example.com');

      expect(found).toBeNull();
    });
  });

  describe('findByAuthProviderExternalId', () => {
    it('should find user by OAuth provider and external ID', async () => {
      const user = createOAuthUser('google', 'google-123');
      await repository.save(user);

      const found = await repository.findByAuthProviderExternalId(
        'google',
        'google-123'
      );

      expect(found).toBe(user);
    });

    it('should return null for non-matching provider', async () => {
      const user = createOAuthUser('google', 'google-123');
      await repository.save(user);

      const found = await repository.findByAuthProviderExternalId(
        'facebook',
        'google-123'
      );

      expect(found).toBeNull();
    });

    it('should return null for non-matching external ID', async () => {
      const user = createOAuthUser('google', 'google-123');
      await repository.save(user);

      const found = await repository.findByAuthProviderExternalId(
        'google',
        'google-456'
      );

      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const user1 = createTestUser('user1@example.com');
      const user2 = createTestUser('user2@example.com');
      await repository.save(user1);
      await repository.save(user2);

      const users = await repository.findAll();

      expect(users).toHaveLength(2);
    });

    it('should return empty array when no users', async () => {
      const users = await repository.findAll();

      expect(users).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      const user = createTestUser();
      await repository.save(user);

      await repository.delete(user.id.value);

      expect(repository.size()).toBe(0);
      expect(await repository.findById(user.id.value)).toBeNull();
    });

    it('should not throw when deleting non-existent user', async () => {
      await expect(repository.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all users', async () => {
      await repository.save(createTestUser('user1@example.com'));
      await repository.save(createTestUser('user2@example.com'));

      repository.clear();

      expect(repository.size()).toBe(0);
    });
  });
});
