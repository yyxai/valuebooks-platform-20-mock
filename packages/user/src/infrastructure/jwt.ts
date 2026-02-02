import { UserTypeValue } from '../domain/UserType.js';

export interface JwtConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresInSeconds: number;
  issuer: string;
  audience: string;
}

export interface AccessTokenPayload {
  sub: string; // User ID
  email: string;
  userType: UserTypeValue;
  roles: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  [key: string]: unknown;
}

export interface RefreshTokenPayload {
  sub: string; // User ID
  jti: string; // Token ID for revocation tracking
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  [key: string]: unknown;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  refreshTokenJti: string;
}

// Simple base64url encoding/decoding
function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return atob(base64);
}

// HMAC-SHA256 signing
async function sign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  return base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );
}

async function verify(payload: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await sign(payload, secret);
  return signature === expectedSignature;
}

export class JwtService {
  constructor(private config: JwtConfig) {}

  async generateTokenPair(
    userId: string,
    email: string,
    userType: UserTypeValue,
    roles: string[]
  ): Promise<TokenPair> {
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    const accessTokenPayload: AccessTokenPayload = {
      sub: userId,
      email,
      userType,
      roles,
      iat: now,
      exp: now + this.config.accessTokenExpiresInSeconds,
      iss: this.config.issuer,
      aud: this.config.audience,
    };

    const refreshTokenPayload: RefreshTokenPayload = {
      sub: userId,
      jti,
      iat: now,
      exp: now + this.config.refreshTokenExpiresInSeconds,
      iss: this.config.issuer,
      aud: this.config.audience,
    };

    const accessToken = await this.createToken(
      accessTokenPayload,
      this.config.accessTokenSecret
    );
    const refreshToken = await this.createToken(
      refreshTokenPayload,
      this.config.refreshTokenSecret
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(accessTokenPayload.exp * 1000),
      refreshTokenExpiresAt: new Date(refreshTokenPayload.exp * 1000),
      refreshTokenJti: jti,
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    return this.verifyToken<AccessTokenPayload>(
      token,
      this.config.accessTokenSecret
    );
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    return this.verifyToken<RefreshTokenPayload>(
      token,
      this.config.refreshTokenSecret
    );
  }

  private async createToken(
    payload: Record<string, unknown>,
    secret: string
  ): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerEncoded = base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    const signature = await sign(signatureInput, secret);

    return `${signatureInput}.${signature}`;
  }

  private async verifyToken<T>(
    token: string,
    secret: string
  ): Promise<T | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [headerEncoded, payloadEncoded, signature] = parts;
      const signatureInput = `${headerEncoded}.${payloadEncoded}`;

      const isValid = await verify(signatureInput, signature, secret);
      if (!isValid) {
        return null;
      }

      const payload = JSON.parse(base64UrlDecode(payloadEncoded)) as T & {
        exp: number;
        iss: string;
        aud: string;
      };

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        return null;
      }

      // Check issuer and audience
      if (payload.iss !== this.config.issuer) {
        return null;
      }
      if (payload.aud !== this.config.audience) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}

export function createDefaultJwtConfig(
  accessTokenSecret: string,
  refreshTokenSecret: string
): JwtConfig {
  return {
    accessTokenSecret,
    refreshTokenSecret,
    accessTokenExpiresInSeconds: 15 * 60, // 15 minutes
    refreshTokenExpiresInSeconds: 7 * 24 * 60 * 60, // 7 days
    issuer: 'valuebooks',
    audience: 'valuebooks-api',
  };
}
