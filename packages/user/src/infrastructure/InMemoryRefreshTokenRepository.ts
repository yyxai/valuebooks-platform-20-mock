import {
  RefreshToken,
  RefreshTokenRepository,
} from './RefreshTokenRepository.js';

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private tokens = new Map<string, RefreshToken>();

  async save(token: RefreshToken): Promise<void> {
    this.tokens.set(token.jti, token);
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    return this.tokens.get(jti) ?? null;
  }

  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    const now = new Date();
    return Array.from(this.tokens.values()).filter(
      (token) =>
        token.userId === userId &&
        !token.revokedAt &&
        token.expiresAt > now
    );
  }

  async revoke(jti: string): Promise<void> {
    const token = this.tokens.get(jti);
    if (token) {
      token.revokedAt = new Date();
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const now = new Date();
    for (const token of this.tokens.values()) {
      if (token.userId === userId && !token.revokedAt) {
        token.revokedAt = now;
      }
    }
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const [jti, token] of this.tokens.entries()) {
      if (token.expiresAt <= now) {
        this.tokens.delete(jti);
        count++;
      }
    }
    return count;
  }

  // Test helper methods
  clear(): void {
    this.tokens.clear();
  }

  size(): number {
    return this.tokens.size;
  }
}
