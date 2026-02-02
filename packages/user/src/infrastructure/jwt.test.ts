import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JwtService, createDefaultJwtConfig, JwtConfig } from './jwt.js';
import { UserType } from '../domain/UserType.js';

describe('JwtService', () => {
  let jwtService: JwtService;
  let config: JwtConfig;

  beforeEach(() => {
    config = createDefaultJwtConfig('access-secret-key', 'refresh-secret-key');
    jwtService = new JwtService(config);
  });

  describe('generateTokenPair', () => {
    it('should generate valid token pair', async () => {
      const result = await jwtService.generateTokenPair(
        'user-123',
        'user@example.com',
        UserType.CONSUMER,
        ['buyer', 'seller']
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.accessToken).toContain('.');
      expect(result.refreshToken).toContain('.');
      expect(result.accessTokenExpiresAt).toBeInstanceOf(Date);
      expect(result.refreshTokenExpiresAt).toBeInstanceOf(Date);
      expect(result.refreshTokenJti).toBeDefined();
    });

    it('should set correct expiration times', async () => {
      const now = Date.now();
      const result = await jwtService.generateTokenPair(
        'user-123',
        'user@example.com',
        UserType.CONSUMER,
        []
      );

      const accessExpiry = result.accessTokenExpiresAt.getTime();
      const refreshExpiry = result.refreshTokenExpiresAt.getTime();

      // Access token should expire in ~15 minutes
      expect(accessExpiry - now).toBeGreaterThan(14 * 60 * 1000);
      expect(accessExpiry - now).toBeLessThan(16 * 60 * 1000);

      // Refresh token should expire in ~7 days
      expect(refreshExpiry - now).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
      expect(refreshExpiry - now).toBeLessThan(8 * 24 * 60 * 60 * 1000);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const tokens = await jwtService.generateTokenPair(
        'user-123',
        'user@example.com',
        UserType.CONSUMER,
        ['buyer']
      );

      const payload = await jwtService.verifyAccessToken(tokens.accessToken);

      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe('user-123');
      expect(payload?.email).toBe('user@example.com');
      expect(payload?.userType).toBe(UserType.CONSUMER);
      expect(payload?.roles).toEqual(['buyer']);
    });

    it('should reject invalid token', async () => {
      const payload = await jwtService.verifyAccessToken('invalid.token.here');

      expect(payload).toBeNull();
    });

    it('should reject token with wrong signature', async () => {
      const tokens = await jwtService.generateTokenPair(
        'user-123',
        'user@example.com',
        UserType.CONSUMER,
        []
      );

      // Tamper with the signature
      const parts = tokens.accessToken.split('.');
      parts[2] = 'tampered-signature';
      const tamperedToken = parts.join('.');

      const payload = await jwtService.verifyAccessToken(tamperedToken);

      expect(payload).toBeNull();
    });

    it('should reject expired token', async () => {
      // Create a config with very short expiration
      const shortConfig = {
        ...config,
        accessTokenExpiresInSeconds: -1, // Already expired
      };
      const shortService = new JwtService(shortConfig);

      const tokens = await shortService.generateTokenPair(
        'user-123',
        'user@example.com',
        UserType.CONSUMER,
        []
      );

      const payload = await shortService.verifyAccessToken(tokens.accessToken);

      expect(payload).toBeNull();
    });

    it('should reject token with wrong issuer', async () => {
      const otherConfig = {
        ...config,
        issuer: 'other-issuer',
      };
      const otherService = new JwtService(otherConfig);

      const tokens = await otherService.generateTokenPair(
        'user-123',
        'user@example.com',
        UserType.CONSUMER,
        []
      );

      // Verify with original service (different issuer)
      const payload = await jwtService.verifyAccessToken(tokens.accessToken);

      expect(payload).toBeNull();
    });

    it('should reject token with wrong audience', async () => {
      const otherConfig = {
        ...config,
        audience: 'other-audience',
      };
      const otherService = new JwtService(otherConfig);

      const tokens = await otherService.generateTokenPair(
        'user-123',
        'user@example.com',
        UserType.CONSUMER,
        []
      );

      const payload = await jwtService.verifyAccessToken(tokens.accessToken);

      expect(payload).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      const tokens = await jwtService.generateTokenPair(
        'user-123',
        'user@example.com',
        UserType.CONSUMER,
        []
      );

      const payload = await jwtService.verifyRefreshToken(tokens.refreshToken);

      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe('user-123');
      expect(payload?.jti).toBe(tokens.refreshTokenJti);
    });

    it('should reject refresh token verified as access token', async () => {
      const tokens = await jwtService.generateTokenPair(
        'user-123',
        'user@example.com',
        UserType.CONSUMER,
        []
      );

      // Try to verify refresh token with access token method
      // (different secret)
      const payload = await jwtService.verifyAccessToken(tokens.refreshToken);

      expect(payload).toBeNull();
    });

    it('should reject access token verified as refresh token', async () => {
      const tokens = await jwtService.generateTokenPair(
        'user-123',
        'user@example.com',
        UserType.CONSUMER,
        []
      );

      const payload = await jwtService.verifyRefreshToken(tokens.accessToken);

      expect(payload).toBeNull();
    });
  });

  describe('createDefaultJwtConfig', () => {
    it('should create config with default values', () => {
      const config = createDefaultJwtConfig('access', 'refresh');

      expect(config.accessTokenSecret).toBe('access');
      expect(config.refreshTokenSecret).toBe('refresh');
      expect(config.accessTokenExpiresInSeconds).toBe(15 * 60);
      expect(config.refreshTokenExpiresInSeconds).toBe(7 * 24 * 60 * 60);
      expect(config.issuer).toBe('valuebooks');
      expect(config.audience).toBe('valuebooks-api');
    });
  });
});
