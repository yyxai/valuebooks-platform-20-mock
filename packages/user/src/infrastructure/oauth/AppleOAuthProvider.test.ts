import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AppleOAuthProvider } from './AppleOAuthProvider.js';

describe('AppleOAuthProvider', () => {
  let provider: AppleOAuthProvider;
  const mockConfig = {
    clientId: 'com.valuebooks.app',
    teamId: 'TEAM123',
    keyId: 'KEY123',
    privateKey: 'mock-private-key',
  };

  beforeEach(() => {
    provider = new AppleOAuthProvider(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('should generate valid authorization URL', () => {
      const url = provider.getAuthorizationUrl(
        'test-state',
        'https://example.com/callback'
      );

      expect(url).toContain('https://appleid.apple.com/auth/authorize');
      expect(url).toContain('client_id=com.valuebooks.app');
      expect(url).toContain('state=test-state');
      expect(url).toContain('response_type=code');
      expect(url).toContain('response_mode=form_post');
      expect(url).toContain('scope=name');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens', async () => {
      const mockResponse = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const tokens = await provider.exchangeCodeForTokens(
        'auth-code',
        'https://example.com/callback'
      );

      expect(tokens.accessToken).toBe('mock-access-token');
      expect(tokens.refreshToken).toBe('mock-refresh-token');
    });

    it('should throw error on failed token exchange', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Invalid code'),
      } as Response);

      await expect(
        provider.exchangeCodeForTokens('invalid-code', 'https://example.com/callback')
      ).rejects.toThrow('Failed to exchange code for tokens');
    });
  });

  describe('getUserInfo', () => {
    it('should throw error directing to use verifyIdToken', async () => {
      await expect(provider.getUserInfo('token')).rejects.toThrow(
        'Apple Sign In requires ID token verification'
      );
    });
  });

  describe('verifyIdToken', () => {
    it('should parse valid ID token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: 'https://appleid.apple.com',
        aud: 'com.valuebooks.app',
        exp: now + 3600,
        sub: 'apple-user-123',
        email: 'user@privaterelay.appleid.com',
        email_verified: 'true',
      };

      const idToken = createMockJwt(payload);
      const userInfo = await provider.verifyIdToken(idToken);

      expect(userInfo.externalId).toBe('apple-user-123');
      expect(userInfo.email).toBe('user@privaterelay.appleid.com');
      expect(userInfo.emailVerified).toBe(true);
    });

    it('should throw for invalid token format', async () => {
      await expect(provider.verifyIdToken('invalid')).rejects.toThrow(
        'Invalid ID token format'
      );
    });

    it('should throw for invalid issuer', async () => {
      const payload = {
        iss: 'https://invalid-issuer.com',
        aud: 'com.valuebooks.app',
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'user-123',
        email: 'user@example.com',
      };

      const idToken = createMockJwt(payload);
      await expect(provider.verifyIdToken(idToken)).rejects.toThrow(
        'Invalid token issuer'
      );
    });

    it('should throw for invalid audience', async () => {
      const payload = {
        iss: 'https://appleid.apple.com',
        aud: 'com.other.app',
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'user-123',
        email: 'user@example.com',
      };

      const idToken = createMockJwt(payload);
      await expect(provider.verifyIdToken(idToken)).rejects.toThrow(
        'Invalid token audience'
      );
    });

    it('should throw for expired token', async () => {
      const payload = {
        iss: 'https://appleid.apple.com',
        aud: 'com.valuebooks.app',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired
        sub: 'user-123',
        email: 'user@example.com',
      };

      const idToken = createMockJwt(payload);
      await expect(provider.verifyIdToken(idToken)).rejects.toThrow(
        'Token has expired'
      );
    });
  });
});

function createMockJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${headerBase64}.${payloadBase64}.mock-signature`;
}
