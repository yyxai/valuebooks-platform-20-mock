import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GoogleOAuthProvider } from './GoogleOAuthProvider.js';

describe('GoogleOAuthProvider', () => {
  let provider: GoogleOAuthProvider;
  const mockConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  };

  beforeEach(() => {
    provider = new GoogleOAuthProvider(mockConfig);
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

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=test-state');
      expect(url).toContain(
        'redirect_uri=' + encodeURIComponent('https://example.com/callback')
      );
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid');
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
      expect(tokens.expiresIn).toBe(3600);
      expect(tokens.tokenType).toBe('Bearer');
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
    it('should get user info with valid token', async () => {
      const mockUserInfo = {
        id: 'google-user-123',
        email: 'user@gmail.com',
        name: 'Test User',
        verified_email: true,
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserInfo),
      } as Response);

      const userInfo = await provider.getUserInfo('valid-access-token');

      expect(userInfo.externalId).toBe('google-user-123');
      expect(userInfo.email).toBe('user@gmail.com');
      expect(userInfo.name).toBe('Test User');
      expect(userInfo.emailVerified).toBe(true);
    });

    it('should use email prefix as name if name not provided', async () => {
      const mockUserInfo = {
        id: 'google-user-123',
        email: 'testuser@gmail.com',
        verified_email: true,
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserInfo),
      } as Response);

      const userInfo = await provider.getUserInfo('valid-access-token');

      expect(userInfo.name).toBe('testuser');
    });

    it('should throw error on failed user info request', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Unauthorized'),
      } as Response);

      await expect(
        provider.getUserInfo('invalid-token')
      ).rejects.toThrow('Failed to get user info');
    });
  });
});
