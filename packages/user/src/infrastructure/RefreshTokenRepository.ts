export interface RefreshToken {
  jti: string;
  userId: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
}

export interface RefreshTokenRepository {
  save(token: RefreshToken): Promise<void>;
  findByJti(jti: string): Promise<RefreshToken | null>;
  findActiveByUserId(userId: string): Promise<RefreshToken[]>;
  revoke(jti: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
