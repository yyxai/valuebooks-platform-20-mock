import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@valuebooks/shared';
import { createUserRoutes, UserRoutesConfig } from './routes.js';
import { AuthenticationService } from '../services/AuthenticationService.js';
import { UserService } from '../services/UserService.js';
import { RoleService } from '../services/RoleService.js';
import { JwtService, createDefaultJwtConfig } from '../infrastructure/jwt.js';
import { InMemoryUserRepository } from '../infrastructure/InMemoryUserRepository.js';
import { InMemoryRoleRepository } from '../infrastructure/InMemoryRoleRepository.js';
import { InMemoryRefreshTokenRepository } from '../infrastructure/InMemoryRefreshTokenRepository.js';
import { User } from '../domain/User.js';
import { Email } from '../domain/value-objects/Email.js';
import { HashedPassword } from '../domain/value-objects/HashedPassword.js';
import { UserProfile } from '../domain/value-objects/UserProfile.js';
import { AuthProvider } from '../domain/value-objects/AuthProvider.js';
import { UserType } from '../domain/UserType.js';
import { UserStatus } from '../domain/UserStatus.js';
import { SystemRoleIds } from '../domain/SystemRoles.js';

describe('User Routes', () => {
  let app: ReturnType<typeof createUserRoutes>;
  let config: UserRoutesConfig;
  let userRepository: InMemoryUserRepository;
  let roleRepository: InMemoryRoleRepository;
  let refreshTokenRepository: InMemoryRefreshTokenRepository;
  let eventBus: EventBus;
  let jwtService: JwtService;
  let authService: AuthenticationService;
  let userService: UserService;
  let roleService: RoleService;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    roleRepository = new InMemoryRoleRepository();
    refreshTokenRepository = new InMemoryRefreshTokenRepository();
    eventBus = new EventBus();
    jwtService = new JwtService(
      createDefaultJwtConfig('access-secret', 'refresh-secret')
    );

    authService = new AuthenticationService(
      userRepository,
      roleRepository,
      refreshTokenRepository,
      jwtService,
      eventBus
    );
    userService = new UserService(userRepository, eventBus);
    roleService = new RoleService(roleRepository, userRepository, eventBus);

    config = { authService, userService, roleService, jwtService };
    app = createUserRoutes(config);
  });

  describe('POST /register', () => {
    it('should register a new user', async () => {
      const res = await app.request('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'new@example.com',
          password: 'ValidPass123',
          name: 'New User',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.user.email).toBe('new@example.com');
      expect(body.tokens.accessToken).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      await authService.register({
        email: 'existing@example.com',
        password: 'ValidPass123',
        name: 'Existing',
      });

      const res = await app.request('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'ValidPass123',
          name: 'New User',
        }),
      });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'User',
      });
    });

    it('should login with valid credentials', async () => {
      const res = await app.request('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'ValidPass123',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.email).toBe('user@example.com');
      expect(body.tokens.accessToken).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await app.request('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'WrongPass123',
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const registerResult = await authService.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'User',
      });

      const res = await app.request('/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: registerResult.tokens.refreshToken,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accessToken).toBeDefined();
    });
  });

  describe('GET /me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'User',
      });
      accessToken = result.tokens.accessToken;
    });

    it('should return current user', async () => {
      const res = await app.request('/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.email).toBe('user@example.com');
    });

    it('should return 401 without token', async () => {
      const res = await app.request('/me');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /me/profile', () => {
    let accessToken: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'User',
      });
      accessToken = result.tokens.accessToken;
    });

    it('should update user profile', async () => {
      const res = await app.request('/me/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Updated Name', phone: '123-456' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.profile.name).toBe('Updated Name');
      expect(body.user.profile.phone).toBe('123-456');
    });
  });

  describe('POST /me/change-password', () => {
    let accessToken: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'User',
      });
      accessToken = result.tokens.accessToken;
    });

    it('should change password', async () => {
      const res = await app.request('/me/change-password', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: 'ValidPass123',
          newPassword: 'NewValidPass456',
        }),
      });

      expect(res.status).toBe(200);
    });

    it('should return 401 for wrong current password', async () => {
      const res = await app.request('/me/change-password', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: 'WrongPass123',
          newPassword: 'NewValidPass456',
        }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Admin routes', () => {
    let adminToken: string;
    let normalToken: string;
    let adminUser: User;

    beforeEach(async () => {
      // Create admin user
      adminUser = User.create({
        email: new Email('admin@valuebooks.co.jp'),
        password: new HashedPassword('hash', 'salt'),
        userType: UserType.EMPLOYEE,
        authProvider: AuthProvider.email(),
        profile: new UserProfile({ name: 'Admin' }),
      });
      adminUser.verify(); // Make active
      await userRepository.save(adminUser);
      await roleService.assignRoleToUser({
        userId: adminUser.id.value,
        roleId: SystemRoleIds.ADMIN,
      });

      // Re-fetch user to get updated role assignments
      const updatedAdmin = await userRepository.findById(adminUser.id.value);
      const adminTokens = await jwtService.generateTokenPair(
        updatedAdmin!.id.value,
        'admin@valuebooks.co.jp',
        UserType.EMPLOYEE,
        updatedAdmin!.getActiveRoleIds()
      );
      adminToken = adminTokens.accessToken;

      // Create normal user
      const normalResult = await authService.register({
        email: 'user@example.com',
        password: 'ValidPass123',
        name: 'Normal User',
      });
      normalToken = normalResult.tokens.accessToken;
    });

    describe('GET /admin/users', () => {
      it('should return user list for admin', async () => {
        const res = await app.request('/admin/users', {
          headers: { Authorization: `Bearer ${adminToken}` },
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.items.length).toBeGreaterThan(0);
      });

      it('should return 403 for non-admin', async () => {
        const res = await app.request('/admin/users', {
          headers: { Authorization: `Bearer ${normalToken}` },
        });

        expect(res.status).toBe(403);
      });
    });

    describe('POST /admin/users/:id/status', () => {
      it('should change user status', async () => {
        const user = await userRepository.findByEmail('user@example.com');

        const res = await app.request(`/admin/users/${user!.id.value}/status`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: UserStatus.SUSPENDED }),
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.user.status).toBe(UserStatus.SUSPENDED);
      });
    });

    describe('GET /admin/roles', () => {
      it('should return role list for admin', async () => {
        const res = await app.request('/admin/roles', {
          headers: { Authorization: `Bearer ${adminToken}` },
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.roles.length).toBeGreaterThan(0);
      });
    });

    describe('POST /admin/roles', () => {
      it('should create a new role', async () => {
        const res = await app.request('/admin/roles', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Custom Role',
            description: 'Test role',
            permissions: ['listings:read'],
            applicableUserTypes: [UserType.CONSUMER],
          }),
        });

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.role.name).toBe('Custom Role');
      });
    });
  });
});
