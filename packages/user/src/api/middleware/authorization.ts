import { Context, Next } from 'hono';
import { RoleService } from '../../services/RoleService.js';
import { getAuthContext } from './auth.js';

export function createAuthorizationMiddleware(
  roleService: RoleService,
  requiredPermission: string
) {
  return async (c: Context, next: Next) => {
    const auth = getAuthContext(c);
    const userId = auth.user.sub;

    const hasPermission = await roleService.userHasPermission(
      userId,
      requiredPermission
    );

    if (!hasPermission) {
      return c.json(
        { error: 'Forbidden: insufficient permissions' },
        403
      );
    }

    await next();
  };
}

export function requirePermissions(
  roleService: RoleService,
  ...permissions: string[]
) {
  return async (c: Context, next: Next) => {
    const auth = getAuthContext(c);
    const userId = auth.user.sub;

    for (const permission of permissions) {
      const hasPermission = await roleService.userHasPermission(
        userId,
        permission
      );

      if (!hasPermission) {
        return c.json(
          { error: `Forbidden: missing permission "${permission}"` },
          403
        );
      }
    }

    await next();
  };
}

export function requireAnyPermission(
  roleService: RoleService,
  ...permissions: string[]
) {
  return async (c: Context, next: Next) => {
    const auth = getAuthContext(c);
    const userId = auth.user.sub;

    for (const permission of permissions) {
      const hasPermission = await roleService.userHasPermission(
        userId,
        permission
      );

      if (hasPermission) {
        await next();
        return;
      }
    }

    return c.json(
      { error: 'Forbidden: insufficient permissions' },
      403
    );
  };
}
