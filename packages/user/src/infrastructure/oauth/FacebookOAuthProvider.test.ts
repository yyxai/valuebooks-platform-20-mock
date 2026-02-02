import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FacebookOAuthProvider } from './FacebookOAuthProvider.js';

describe('FacebookOAuthProvider', () => {
  let provider: FacebookOAuthProvider;
  const mockConfig = {
    clientId: 'fb-app-id',
    clientSecret: 'fb-app-secret',
  };

  beforeEach(() => {
    provider = new FacebookOAuthProvider(mockConfig);
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

      expect(url).toContain('https://www.facebook.com/v18.0/dialog/oauth');
      expect(url).toContain('client_id=fb-app-id');
      expect(url).toContain('state=test-state');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=email');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens', async () => {
      const mockResponse = {
        access_token: 'mock-access-token',
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
      expect(tokens.expiresIn).toBe(3600);
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
        id: 'fb-user-123',
        email: 'user@facebook.com',
        name: 'Facebook User',
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserInfo),
      } as Response);

      const userInfo = await provider.getUserInfo('valid-access-token');

      expect(userInfo.externalId).toBe('fb-user-123');
      expect(userInfo.email).toBe('user@facebook.com');
      expect(userInfo.name).toBe('Facebook User');
      expect(userInfo.emailVerified).toBe(true);
    });

    it('should use email prefix as name if name not provided', async () => {
      const mockUserInfo = {
        id: 'fb-user-123',
        email: 'testuser@facebook.com',
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserInfo),
      } as Response);

      const userInfo = await provider.getUserInfo('valid-access-token');

      expect(userInfo.name).toBe('testuser');
    });

    it('should throw error if email not provided', async () => {
      const mockUserInfo = {
        id: 'fb-user-123',
        name: 'Facebook User',
        // No email
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserInfo),
      } as Response);

      await expect(
        provider.getUserInfo('valid-access-token')
      ).rejects.toThrow('Email not provided');
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
