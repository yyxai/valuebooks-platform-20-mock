import { Hono } from 'hono';
import { AuthenticationService } from '../services/AuthenticationService.js';
import { UserService } from '../services/UserService.js';
import { RoleService } from '../services/RoleService.js';
import { JwtService } from '../infrastructure/jwt.js';
import { createAuthMiddleware, getAuthContext } from './middleware/auth.js';
import { createAuthorizationMiddleware } from './middleware/authorization.js';
import { User } from '../domain/User.js';

export interface UserRoutesConfig {
  authService: AuthenticationService;
  userService: UserService;
  roleService: RoleService;
  jwtService: JwtService;
}

export function createUserRoutes(config: UserRoutesConfig): Hono {
  const { authService, userService, roleService, jwtService } = config;
  const app = new Hono();
  const authMiddleware = createAuthMiddleware(jwtService);

  // ===== PUBLIC ROUTES =====

  // Register new user
  app.post('/register', async (c) => {
    try {
      const body = await c.req.json();
      const result = await authService.register({
        email: body.email,
        password: body.password,
        name: body.name,
        phone: body.phone,
        userType: body.userType,
      });

      return c.json({
        user: formatUser(result.user),
        tokens: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: result.tokens.accessTokenExpiresAt,
        },
      }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('already registered')) {
        return c.json({ error: message }, 409);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Login
  app.post('/login', async (c) => {
    try {
      const body = await c.req.json();
      const result = await authService.login({
        email: body.email,
        password: body.password,
      });

      return c.json({
        user: formatUser(result.user),
        tokens: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: result.tokens.accessTokenExpiresAt,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Invalid credentials') || message.includes('not active')) {
        return c.json({ error: message }, 401);
      }
      return c.json({ error: message }, 400);
    }
  });

  // OAuth login
  app.post('/oauth/:provider', async (c) => {
    try {
      const provider = c.req.param('provider');
      const body = await c.req.json();

      const result = await authService.oauthLogin({
        provider: provider as 'google' | 'apple' | 'amazon' | 'facebook',
        externalId: body.externalId,
        email: body.email,
        name: body.name,
      });

      return c.json({
        user: formatUser(result.user),
        tokens: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          expiresAt: result.tokens.accessTokenExpiresAt,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  // Refresh tokens
  app.post('/refresh', async (c) => {
    try {
      const body = await c.req.json();
      const tokens = await authService.refreshTokens(body.refreshToken);

      return c.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.accessTokenExpiresAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 401);
    }
  });

  // Verify email
  app.post('/verify-email', async (c) => {
    try {
      const body = await c.req.json();
      const user = await authService.verifyEmail(body.userId);
      return c.json({ user: formatUser(user) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  // ===== PROTECTED ROUTES =====

  // Get current user
  app.get('/me', authMiddleware, async (c) => {
    const auth = getAuthContext(c);
    const user = await userService.getById(auth.user.sub);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user: formatUser(user) });
  });

  // Update profile
  app.patch('/me/profile', authMiddleware, async (c) => {
    try {
      const auth = getAuthContext(c);
      const body = await c.req.json();

      const user = await userService.updateProfile(auth.user.sub, {
        name: body.name,
        phone: body.phone,
      });

      return c.json({ user: formatUser(user) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  // Change password
  app.post('/me/change-password', authMiddleware, async (c) => {
    try {
      const auth = getAuthContext(c);
      const body = await c.req.json();

      await userService.changePassword(auth.user.sub, {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      });

      return c.json({ message: 'Password changed successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('incorrect')) {
        return c.json({ error: message }, 401);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Logout
  app.post('/me/logout', authMiddleware, async (c) => {
    try {
      const body = await c.req.json();
      await authService.logout(body.refreshToken);
      return c.json({ message: 'Logged out successfully' });
    } catch (error) {
      // Logout should succeed even if token is invalid
      return c.json({ message: 'Logged out successfully' });
    }
  });

  // Logout everywhere
  app.post('/me/logout-all', authMiddleware, async (c) => {
    const auth = getAuthContext(c);
    await authService.logoutAll(auth.user.sub);
    return c.json({ message: 'Logged out of all sessions' });
  });

  // Get user roles
  app.get('/me/roles', authMiddleware, async (c) => {
    const auth = getAuthContext(c);
    const roles = await roleService.getUserRoles(auth.user.sub);

    return c.json({
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions.map((p) => p.value),
      })),
    });
  });

  // ===== ADMIN ROUTES =====

  const adminMiddleware = createAuthorizationMiddleware(roleService, 'users:read');
  const adminWriteMiddleware = createAuthorizationMiddleware(roleService, 'users:write');
  const rolesReadMiddleware = createAuthorizationMiddleware(roleService, 'roles:read');
  const rolesWriteMiddleware = createAuthorizationMiddleware(roleService, 'roles:write');

  // List users
  app.get('/admin/users', authMiddleware, adminMiddleware, async (c) => {
    const query = c.req.query();
    const result = await userService.listUsers({
      email: query.email,
      userType: query.userType,
      status: query.status as 'pending_verification' | 'active' | 'suspended' | 'deactivated',
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
    });

    return c.json({
      items: result.items.map(formatUser),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  });

  // Get user by ID
  app.get('/admin/users/:id', authMiddleware, adminMiddleware, async (c) => {
    const user = await userService.getById(c.req.param('id'));
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json({ user: formatUser(user) });
  });

  // Change user status
  app.post('/admin/users/:id/status', authMiddleware, adminWriteMiddleware, async (c) => {
    try {
      const body = await c.req.json();
      const auth = getAuthContext(c);

      const user = await userService.changeStatus(
        c.req.param('id'),
        body.status,
        body.reason,
        auth.user.sub
      );

      return c.json({ user: formatUser(user) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'User not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Assign role to user
  app.post('/admin/users/:id/roles', authMiddleware, adminWriteMiddleware, async (c) => {
    try {
      const body = await c.req.json();
      const auth = getAuthContext(c);

      await roleService.assignRoleToUser({
        userId: c.req.param('id'),
        roleId: body.roleId,
        assignedBy: auth.user.sub,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        scope: body.scope,
      });

      return c.json({ message: 'Role assigned successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found')) {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Remove role from user
  app.delete('/admin/users/:id/roles/:roleId', authMiddleware, adminWriteMiddleware, async (c) => {
    try {
      const auth = getAuthContext(c);
      await roleService.removeRoleFromUser(
        c.req.param('id'),
        c.req.param('roleId'),
        auth.user.sub
      );
      return c.json({ message: 'Role removed successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found') || message.includes('does not have')) {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  // List roles
  app.get('/admin/roles', authMiddleware, rolesReadMiddleware, async (c) => {
    const roles = await roleService.listRoles();
    return c.json({
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions.map((p) => p.value),
        applicableUserTypes: r.applicableUserTypes,
        isSystem: r.isSystem,
      })),
    });
  });

  // Create role
  app.post('/admin/roles', authMiddleware, rolesWriteMiddleware, async (c) => {
    try {
      const body = await c.req.json();
      const role = await roleService.createRole({
        name: body.name,
        description: body.description,
        permissions: body.permissions,
        applicableUserTypes: body.applicableUserTypes,
      });

      return c.json({
        role: {
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: role.permissions.map((p) => p.value),
          applicableUserTypes: role.applicableUserTypes,
          isSystem: role.isSystem,
        },
      }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  // Update role
  app.patch('/admin/roles/:id', authMiddleware, rolesWriteMiddleware, async (c) => {
    try {
      const body = await c.req.json();
      const role = await roleService.updateRole(c.req.param('id'), {
        name: body.name,
        description: body.description,
        permissions: body.permissions,
      });

      return c.json({
        role: {
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: role.permissions.map((p) => p.value),
          applicableUserTypes: role.applicableUserTypes,
          isSystem: role.isSystem,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Role not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Delete role
  app.delete('/admin/roles/:id', authMiddleware, rolesWriteMiddleware, async (c) => {
    try {
      await roleService.deleteRole(c.req.param('id'));
      return c.json({ message: 'Role deleted successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Role not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  return app;
}

function formatUser(user: User) {
  return {
    id: user.id.value,
    email: user.email.value,
    userType: user.userType,
    status: user.status,
    profile: {
      name: user.profile.name,
      phone: user.profile.phone,
    },
    authProvider: user.authProvider.type,
    roles: user.getActiveRoleIds(),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
}
