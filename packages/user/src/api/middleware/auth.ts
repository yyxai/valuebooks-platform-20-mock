import { Context, Next } from 'hono';
import { JwtService, AccessTokenPayload } from '../../infrastructure/jwt.js';

export interface AuthContext {
  user: AccessTokenPayload;
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export function createAuthMiddleware(jwtService: JwtService) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Missing authorization header' }, 401);
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return c.json({ error: 'Invalid authorization header format' }, 401);
    }

    const payload = await jwtService.verifyAccessToken(token);
    if (!payload) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    c.set('auth', { user: payload });
    await next();
  };
}

export function getAuthContext(c: Context): AuthContext {
  const auth = c.get('auth');
  if (!auth) {
    throw new Error('Auth context not found. Ensure auth middleware is applied.');
  }
  return auth;
}
