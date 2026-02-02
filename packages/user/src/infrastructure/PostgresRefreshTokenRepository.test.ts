import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { PostgresRefreshTokenRepository } from './PostgresRefreshTokenRepository.js';
import type { RefreshToken } from './RefreshTokenRepository.js';

// Skip tests if DATABASE_URL is not set
const DATABASE_URL = process.env.DATABASE_URL;
const describeFn = DATABASE_URL ? describe : describe.skip;

describeFn('PostgresRefreshTokenRepository', () => {
  let sql: postgres.Sql;
  let repository: PostgresRefreshTokenRepository;
  const testUserId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    sql = postgres(DATABASE_URL!, { max: 1 });
    repository = new PostgresRefreshTokenRepository(sql);

    // Ensure users table exists (for foreign key constraint)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        password_salt VARCHAR(255),
        user_type VARCHAR(50) NOT NULL DEFAULT 'consumer',
        auth_provider VARCHAR(50) NOT NULL DEFAULT 'email',
        auth_provider_external_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        profile_name VARCHAR(255) NOT NULL DEFAULT 'Test User',
        profile_phone VARCHAR(50),
        employee_department VARCHAR(100),
        employee_title VARCHAR(100),
        partner_company_name VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      )
    `;

    // Ensure refresh_tokens table exists
    await sql`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        jti UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        device_info JSONB
      )
    `;

    // Create test user
    await sql`
      INSERT INTO users (id, email, user_type, profile_name)
      VALUES (${testUserId}, 'test-refresh@example.com', 'consumer', 'Test User')
      ON CONFLICT (id) DO NOTHING
    `;
  });

  afterAll(async () => {
    // Clean up test user
    await sql`DELETE FROM users WHERE id = ${testUserId}`;
    await sql.end();
  });

  beforeEach(async () => {
    // Clean up refresh tokens before each test
    await sql`DELETE FROM refresh_tokens WHERE user_id = ${testUserId}`;
    // Ensure test user exists
    await sql`
      INSERT INTO users (id, email, user_type, profile_name)
      VALUES (${testUserId}, 'test-refresh@example.com', 'consumer', 'Test User')
      ON CONFLICT (id) DO NOTHING
    `;
  });

  function createTestToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
    return {
      jti: crypto.randomUUID(),
      userId: testUserId,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      revokedAt: undefined,
      ...overrides,
    };
  }

  it('should save and retrieve a token by jti', async () => {
    const token = createTestToken();
    await repository.save(token);

    const found = await repository.findByJti(token.jti);

    expect(found).not.toBeNull();
    expect(found!.jti).toBe(token.jti);
    expect(found!.userId).toBe(token.userId);
    expect(found!.revokedAt).toBeUndefined();
  });

  it('should return null for non-existent token', async () => {
    const found = await repository.findByJti('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });

  it('should find active tokens by user id', async () => {
    // Create multiple tokens
    const token1 = createTestToken();
    const token2 = createTestToken();
    const expiredToken = createTestToken({
      expiresAt: new Date(Date.now() - 1000), // Already expired
    });

    await repository.save(token1);
    await repository.save(token2);
    await repository.save(expiredToken);

    const activeTokens = await repository.findActiveByUserId(testUserId);

    expect(activeTokens).toHaveLength(2);
    expect(activeTokens.some((t) => t.jti === token1.jti)).toBe(true);
    expect(activeTokens.some((t) => t.jti === token2.jti)).toBe(true);
    expect(activeTokens.some((t) => t.jti === expiredToken.jti)).toBe(false);
  });

  it('should revoke a token', async () => {
    const token = createTestToken();
    await repository.save(token);

    await repository.revoke(token.jti);

    const found = await repository.findByJti(token.jti);
    expect(found!.revokedAt).toBeDefined();

    // Should not be in active tokens
    const activeTokens = await repository.findActiveByUserId(testUserId);
    expect(activeTokens.some((t) => t.jti === token.jti)).toBe(false);
  });

  it('should revoke all tokens for user', async () => {
    const token1 = createTestToken();
    const token2 = createTestToken();

    await repository.save(token1);
    await repository.save(token2);

    await repository.revokeAllForUser(testUserId);

    const activeTokens = await repository.findActiveByUserId(testUserId);
    expect(activeTokens).toHaveLength(0);

    // Verify both are revoked
    const found1 = await repository.findByJti(token1.jti);
    const found2 = await repository.findByJti(token2.jti);
    expect(found1!.revokedAt).toBeDefined();
    expect(found2!.revokedAt).toBeDefined();
  });

  it('should delete expired tokens', async () => {
    // Create tokens: one active, one expired within 7 days, one expired > 7 days
    const activeToken = createTestToken();
    const recentlyExpired = createTestToken({
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    });
    const oldExpired = createTestToken({
      expiresAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    });

    await repository.save(activeToken);
    await repository.save(recentlyExpired);
    await repository.save(oldExpired);

    const deletedCount = await repository.deleteExpired();

    expect(deletedCount).toBe(1); // Only the old expired token

    // Verify the right tokens remain
    expect(await repository.findByJti(activeToken.jti)).not.toBeNull();
    expect(await repository.findByJti(recentlyExpired.jti)).not.toBeNull();
    expect(await repository.findByJti(oldExpired.jti)).toBeNull();
  });

  it('should not revoke already revoked token', async () => {
    const token = createTestToken();
    await repository.save(token);

    // Revoke twice
    await repository.revoke(token.jti);
    const firstRevoke = await repository.findByJti(token.jti);
    const firstRevokedAt = firstRevoke!.revokedAt;

    // Wait a bit and revoke again
    await new Promise((resolve) => setTimeout(resolve, 10));
    await repository.revoke(token.jti);
    const secondRevoke = await repository.findByJti(token.jti);

    // Should keep the original revoke timestamp
    expect(secondRevoke!.revokedAt!.getTime()).toBe(firstRevokedAt!.getTime());
  });

  it('should update token on save (upsert)', async () => {
    const token = createTestToken();
    await repository.save(token);

    // Update and save again
    const updatedToken = {
      ...token,
      revokedAt: new Date(),
    };
    await repository.save(updatedToken);

    const found = await repository.findByJti(token.jti);
    expect(found!.revokedAt).toBeDefined();
  });
});
