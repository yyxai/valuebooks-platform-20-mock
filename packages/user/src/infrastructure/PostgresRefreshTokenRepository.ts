import postgres from 'postgres';
import type {
  RefreshToken,
  RefreshTokenRepository,
} from './RefreshTokenRepository.js';
import type { RefreshTokenRow } from './db/types.js';

export class PostgresRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly sql: postgres.Sql) {}

  async save(token: RefreshToken): Promise<void> {
    await this.sql`
      INSERT INTO refresh_tokens (jti, user_id, issued_at, expires_at, revoked_at)
      VALUES (
        ${token.jti},
        ${token.userId},
        ${token.issuedAt},
        ${token.expiresAt},
        ${token.revokedAt ?? null}
      )
      ON CONFLICT (jti) DO UPDATE SET
        revoked_at = EXCLUDED.revoked_at
    `;
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    const [row] = await this.sql<RefreshTokenRow[]>`
      SELECT jti, user_id, issued_at, expires_at, revoked_at
      FROM refresh_tokens WHERE jti = ${jti}
    `;

    if (!row) {
      return null;
    }

    return this.toRefreshToken(row);
  }

  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    const rows = await this.sql<RefreshTokenRow[]>`
      SELECT jti, user_id, issued_at, expires_at, revoked_at
      FROM refresh_tokens
      WHERE user_id = ${userId}
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY issued_at DESC
    `;

    return rows.map((row) => this.toRefreshToken(row));
  }

  async revoke(jti: string): Promise<void> {
    await this.sql`
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE jti = ${jti} AND revoked_at IS NULL
    `;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.sql`
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = ${userId} AND revoked_at IS NULL
    `;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.sql`
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW() - INTERVAL '7 days'
    `;

    return result.count;
  }

  private toRefreshToken(row: RefreshTokenRow): RefreshToken {
    return {
      jti: row.jti,
      userId: row.user_id,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at ?? undefined,
    };
  }
}
