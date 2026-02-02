import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createAuthMiddleware, getAuthContext } from './auth.js';
import { JwtService, createDefaultJwtConfig } from '../../infrastructure/jwt.js';
import { UserType } from '../../domain/UserType.js';

describe('auth middleware', () => {
  let app: Hono;
  let jwtService: JwtService;
  let validToken: string;

  beforeEach(async () => {
    jwtService = new JwtService(
      createDefaultJwtConfig('test-access-secret', 'test-refresh-secret')
    );

    const tokens = await jwtService.generateTokenPair(
      'user-123',
      'user@example.com',
      UserType.CONSUMER,
      ['buyer']
    );
    validToken = tokens.accessToken;

    app = new Hono();
    app.use('/protected/*', createAuthMiddleware(jwtService));
    app.get('/protected/resource', (c) => {
      const auth = getAuthContext(c);
      return c.json({ userId: auth.user.sub, email: auth.user.email });
    });
    app.get('/public/resource', (c) => c.json({ message: 'public' }));
  });

  describe('createAuthMiddleware', () => {
    it('should allow request with valid token', async () => {
      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.userId).toBe('user-123');
      expect(body.email).toBe('user@example.com');
    });

    it('should reject request without authorization header', async () => {
      const res = await app.request('/protected/resource');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Missing authorization header');
    });

    it('should reject request with invalid authorization format', async () => {
      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Basic user:pass',
        },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Invalid authorization header format');
    });

    it('should reject request with invalid token', async () => {
      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Invalid or expired token');
    });

    it('should not affect public routes', async () => {
      const res = await app.request('/public/resource');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe('public');
    });
  });

  describe('getAuthContext', () => {
    it('should return auth context when available', async () => {
      const res = await app.request('/protected/resource', {
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      });

      expect(res.status).toBe(200);
    });
  });
});
