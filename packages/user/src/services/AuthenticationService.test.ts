import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@valuebooks/shared';
import { AuthenticationService } from './AuthenticationService.js';
import { InMemoryUserRepository } from '../infrastructure/InMemoryUserRepository.js';
import { InMemoryRoleRepository } from '../infrastructure/InMemoryRoleRepository.js';
import { InMemoryRefreshTokenRepository } from '../infrastructure/InMemoryRefreshTokenRepository.js';
import { JwtService, createDefaultJwtConfig } from '../infrastructure/jwt.js';
import { User } from '../domain/User.js';
import { Email } from '../domain/value-objects/Email.js';
import { HashedPassword } from '../domain/value-objects/HashedPassword.js';
import { UserProfile } from '../domain/value-objects/UserProfile.js';
import { AuthProvider } from '../domain/value-objects/AuthProvider.js';
import { UserType } from '../domain/UserType.js';
import { UserStatus } from '../domain/UserStatus.js';
import { UserEventTypes } from '../domain/events/index.js';
import { hashPassword } from '../infrastructure/password.js';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let userRepository: InMemoryUserRepository;
  let roleRepository: InMemoryRoleRepository;
  let refreshTokenRepository: InMemoryRefreshTokenRepository;
  let jwtService: JwtService;
  let eventBus: EventBus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let publishSpy: any;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    roleRepository = new InMemoryRoleRepository();
    refreshTokenRepository = new InMemoryRefreshTokenRepository();
    jwtService = new JwtService(
      createDefaultJwtConfig('access-secret', 'refresh-secret')
    );
    eventBus = new EventBus();
    publishSpy = vi.spyOn(eventBus, 'publish');

    service = new AuthenticationService(
      userRepository,
      roleRepository,
      refreshTokenRepository,
      jwtService,
      eventBus
    );
  });

  describe('register', () => {
    it('should register a new consumer user', async () => {
      const result = await service.register({
        email: 'new@example.com',
        password: 'ValidPass123',
        name: 'New User',
      });

      expect(result.user.email.value).toBe('new@example.com');
      expect(result.user.profile.name).toBe('New User');
      expect(result.user.userType).toBe(UserType.CONSUMER);
      expect(result.user.status).toBe(UserStatus.PENDING_VERIFICATION);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should assign buyer role to consumer', async () => {
      const result = await service.register({
        email: 'new@example.com',
        password: 'ValidPass123',
        name: 'New User',
      });

      expect(result.user.roleAssignments).toHaveLength(1);
      expect(result.user.hasRole('system-role-buyer')).toBe(true);
    });

    it('should publish UserRegistered event', async () => {
      await service.register({
        email: 'new@example.com',
        password: 'ValidPass123',
        name: 'New User',
      });

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: UserEventTypes.REGISTERED,
          payload: expect.objectContaining({
            email: 'new@example.com',
            name: 'New User',
          }),
        })
      );
    });

    it('should throw for duplicate email', async () => {
      await service.register({
        email: 'existing@example.com',
        password: 'ValidPass123',
        name: 'User 1',
      });

      await expect(
        service.register({
          email: 'existing@example.com',
          password: 'ValidPass123',
          name: 'User 2',
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should throw for employee with non-company email', async () => {
      await expect(
        service.register({
          email: 'employee@gmail.com',
          password: 'ValidPass123',
          name: 'Employee',
          userType: UserType.EMPLOYEE,
        })
      ).rejects.toThrow('Employee accounts require a company email domain');
    });

    it('should allow employee with company email', async () => {
      const result = await service.register({
        email: 'employee@valuebooks.co.jp',
        password: 'ValidPass123',
        name: 'Employee',
        userType: UserType.EMPLOYEE,
      });

      expect(result.user.userType).toBe(UserType.EMPLOYEE);
    });

    it('should store refresh token', async () => {
      const result = await service.register({
        email: 'new@example.com',
        password: 'ValidPass123',
        name: 'New User',
      });

      const storedToken = await refreshTokenRepository.findByJti(
        result.tokens.refreshTokenJti
      );
      expect(storedToken).not.toBeNull();
      expect(storedToken?.userId).toBe(result.user.id.value);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await service.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'Test User',
      });
    });

    it('should login with correct credentials', async () => {
      const result = await service.login({
        email: 'user@example.com',
        password: 'ValidPass123',
      });

      expect(result.user.email.value).toBe('user@example.com');
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should update lastLoginAt', async () => {
      const result = await service.login({
        email: 'user@example.com',
        password: 'ValidPass123',
      });

      expect(result.user.lastLoginAt).toBeInstanceOf(Date);
    });

    it('should publish UserLoggedIn event', async () => {
      publishSpy.mockClear();

      await service.login({
        email: 'user@example.com',
        password: 'ValidPass123',
      });

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: UserEventTypes.LOGGED_IN,
        })
      );
    });

    it('should throw for wrong password', async () => {
      await expect(
        service.login({
          email: 'user@example.com',
          password: 'WrongPass123',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw for non-existent user', async () => {
      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'ValidPass123',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw for suspended user', async () => {
      const user = await userRepository.findByEmail('user@example.com');
      user!.verify();
      user!.suspend();
      await userRepository.save(user!);

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'ValidPass123',
        })
      ).rejects.toThrow('Account is not active');
    });
  });

  describe('oauthLogin', () => {
    it('should create new user for first OAuth login', async () => {
      const result = await service.oauthLogin({
        provider: 'google',
        externalId: 'google-123',
        email: 'oauth@example.com',
        name: 'OAuth User',
      });

      expect(result.user.email.value).toBe('oauth@example.com');
      expect(result.user.authProvider.type).toBe('google');
      expect(result.user.status).toBe(UserStatus.ACTIVE);
    });

    it('should login existing OAuth user', async () => {
      // First login creates user
      await service.oauthLogin({
        provider: 'google',
        externalId: 'google-123',
        email: 'oauth@example.com',
        name: 'OAuth User',
      });

      // Second login finds existing user
      const result = await service.oauthLogin({
        provider: 'google',
        externalId: 'google-123',
        email: 'oauth@example.com',
        name: 'OAuth User',
      });

      expect(result.user.email.value).toBe('oauth@example.com');
      expect(userRepository.size()).toBe(1);
    });

    it('should throw for existing email with different provider', async () => {
      // Register with email
      await service.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'User',
      });

      // Try OAuth with same email
      await expect(
        service.oauthLogin({
          provider: 'google',
          externalId: 'google-123',
          email: 'user@example.com',
          name: 'User',
        })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const loginResult = await service.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'User',
      });

      const newTokens = await service.refreshTokens(loginResult.tokens.refreshToken);

      expect(newTokens.accessToken).toBeDefined();
      // New refresh token should have different JTI
      expect(newTokens.refreshTokenJti).not.toBe(loginResult.tokens.refreshTokenJti);
    });

    it('should revoke old refresh token', async () => {
      const loginResult = await service.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'User',
      });
      const oldJti = loginResult.tokens.refreshTokenJti;

      await service.refreshTokens(loginResult.tokens.refreshToken);

      const oldToken = await refreshTokenRepository.findByJti(oldJti);
      expect(oldToken?.revokedAt).toBeDefined();
    });

    it('should throw for invalid refresh token', async () => {
      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw for revoked refresh token', async () => {
      const loginResult = await service.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'User',
      });

      await refreshTokenRepository.revoke(loginResult.tokens.refreshTokenJti);

      await expect(
        service.refreshTokens(loginResult.tokens.refreshToken)
      ).rejects.toThrow('Refresh token has been revoked');
    });
  });

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      const loginResult = await service.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'User',
      });

      await service.logout(loginResult.tokens.refreshToken);

      const token = await refreshTokenRepository.findByJti(
        loginResult.tokens.refreshTokenJti
      );
      expect(token?.revokedAt).toBeDefined();
    });
  });

  describe('logoutAll', () => {
    it('should revoke all refresh tokens for user', async () => {
      const loginResult = await service.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'User',
      });

      // Login again to get another token
      await service.login({
        email: 'user@example.com',
        password: 'ValidPass123',
      });

      await service.logoutAll(loginResult.user.id.value);

      const activeTokens = await refreshTokenRepository.findActiveByUserId(
        loginResult.user.id.value
      );
      expect(activeTokens).toHaveLength(0);
    });
  });

  describe('verifyEmail', () => {
    it('should verify pending user', async () => {
      const registerResult = await service.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'User',
      });

      const user = await service.verifyEmail(registerResult.user.id.value);

      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('should publish UserVerified event', async () => {
      const registerResult = await service.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'User',
      });
      publishSpy.mockClear();

      await service.verifyEmail(registerResult.user.id.value);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: UserEventTypes.VERIFIED,
        })
      );
    });

    it('should throw for non-existent user', async () => {
      await expect(service.verifyEmail('non-existent')).rejects.toThrow(
        'User not found'
      );
    });
  });
});
