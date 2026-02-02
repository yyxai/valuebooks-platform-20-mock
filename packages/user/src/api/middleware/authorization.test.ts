import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { EventBus } from '@valuebooks/shared';
import { createAuthMiddleware } from './auth.js';
import {
  createAuthorizationMiddleware,
  requirePermissions,
  requireAnyPermission,
} from './authorization.js';
import { JwtService, createDefaultJwtConfig } from '../../infrastructure/jwt.js';
import { RoleService } from '../../services/RoleService.js';
import { InMemoryRoleRepository } from '../../infrastructure/InMemoryRoleRepository.js';
import { InMemoryUserRepository } from '../../infrastructure/InMemoryUserRepository.js';
import { User } from '../../domain/User.js';
import { Email } from '../../domain/value-objects/Email.js';
import { HashedPassword } from '../../domain/value-objects/HashedPassword.js';
import { UserProfile } from '../../domain/value-objects/UserProfile.js';
import { AuthProvider } from '../../domain/value-objects/AuthProvider.js';
import { UserType } from '../../domain/UserType.js';
import { SystemRoleIds } from '../../domain/SystemRoles.js';

describe('authorization middleware', () => {
  let app: Hono;
  let jwtService: JwtService;
  let roleService: RoleService;
  let userRepository: InMemoryUserRepository;
  let roleRepository: InMemoryRoleRepository;
  let eventBus: EventBus;
  let testUser: User;
  let validToken: string;

  beforeEach(async () => {
    jwtService = new JwtService(
      createDefaultJwtConfig('test-access-secret', 'test-refresh-secret')
    );
    userRepository = new InMemoryUserRepository();
    roleRepository = new InMemoryRoleRepository();
    eventBus = new EventBus();
    roleService = new RoleService(roleRepository, userRepository, eventBus);

    // Create test user
    testUser = User.create({
      email: new Email('user@example.com'),
      password: new HashedPassword('hash', 'salt'),
      userType: UserType.CONSUMER,
      authProvider: AuthProvider.email(),
      profile: new UserProfile({ name: 'Test User' }),
    });
    await userRepository.save(testUser);

    // Assign buyer role (has listings:read, orders:read, orders:write)
    await roleService.assignRoleToUser({
      userId: testUser.id.value,
      roleId: SystemRoleIds.BUYER,
    });

    const tokens = await jwtService.generateTokenPair(
      testUser.id.value,
      'user@example.com',
      UserType.CONSUMER,
      [SystemRoleIds.BUYER]
    );
    validToken = tokens.accessToken;

    app = new Hono();
    app.use('/protected/*', createAuthMiddleware(jwtService));
  });

  describe('createAuthorizationMiddleware', () => {
    beforeEach(() => {
      app.use(
        '/protected/listings/*',
        createAuthorizationMiddleware(roleService, 'listings:read')
      );
      app.get('/protected/listings', (c) => c.json({ listings: [] }));

      app.use(
        '/protected/admin/*',
        createAuthorizationMiddleware(roleService, 'admin:delete')
      );
      app.get('/protected/admin/users', (c) => c.json({ users: [] }));
    });

    it('should allow access with required permission', async () => {
      const res = await app.request('/protected/listings', {
        headers: { Authorization: `Bearer ${validToken}` },
      });

      expect(res.status).toBe(200);
    });

    it('should deny access without required permission', async () => {
      const res = await app.request('/protected/admin/users', {
        headers: { Authorization: `Bearer ${validToken}` },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('insufficient permissions');
    });
  });

  describe('requirePermissions', () => {
    beforeEach(() => {
      app.use(
        '/protected/orders/*',
        requirePermissions(roleService, 'orders:read', 'orders:write')
      );
      app.post('/protected/orders', (c) => c.json({ order: { id: '1' } }));
    });

    it('should allow access with all required permissions', async () => {
      const res = await app.request('/protected/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${validToken}` },
      });

      expect(res.status).toBe(200);
    });

    it('should deny access when missing any required permission', async () => {
      // Create user with only read permission
      const readOnlyUser = User.create({
        email: new Email('readonly@example.com'),
        password: new HashedPassword('hash', 'salt'),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.email(),
        profile: new UserProfile({ name: 'Read Only User' }),
      });
      await userRepository.save(readOnlyUser);

      // Seller role has purchase_requests permissions, not orders:write
      await roleService.assignRoleToUser({
        userId: readOnlyUser.id.value,
        roleId: SystemRoleIds.SELLER,
      });

      const tokens = await jwtService.generateTokenPair(
        readOnlyUser.id.value,
        'readonly@example.com',
        UserType.CONSUMER,
        [SystemRoleIds.SELLER]
      );

      const res = await app.request('/protected/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('requireAnyPermission', () => {
    beforeEach(() => {
      app.use(
        '/protected/view/*',
        requireAnyPermission(roleService, 'listings:read', 'orders:read')
      );
      app.get('/protected/view/dashboard', (c) => c.json({ data: [] }));
    });

    it('should allow access with any of the required permissions', async () => {
      const res = await app.request('/protected/view/dashboard', {
        headers: { Authorization: `Bearer ${validToken}` },
      });

      expect(res.status).toBe(200);
    });

    it('should deny access when missing all permissions', async () => {
      // Create user with no relevant permissions
      const noPermsUser = User.create({
        email: new Email('noperms@valuebooks.co.jp'),
        password: new HashedPassword('hash', 'salt'),
        userType: UserType.EMPLOYEE,
        authProvider: AuthProvider.email(),
        profile: new UserProfile({ name: 'No Perms User' }),
      });
      await userRepository.save(noPermsUser);

      const tokens = await jwtService.generateTokenPair(
        noPermsUser.id.value,
        'noperms@valuebooks.co.jp',
        UserType.EMPLOYEE,
        []
      );

      const res = await app.request('/protected/view/dashboard', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      expect(res.status).toBe(403);
    });
  });
});
