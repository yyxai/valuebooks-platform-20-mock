import { OAuthProvider, OAuthTokens, OAuthUserInfo } from './OAuthProvider.js';

export interface AppleOAuthConfig {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}

export class AppleOAuthProvider implements OAuthProvider {
  private static readonly AUTH_URL = 'https://appleid.apple.com/auth/authorize';
  private static readonly TOKEN_URL = 'https://appleid.apple.com/auth/token';

  constructor(private config: AppleOAuthConfig) {}

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'name email',
      state,
      response_mode: 'form_post',
    });

    return `${AppleOAuthProvider.AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<OAuthTokens> {
    const clientSecret = await this.generateClientSecret();

    const response = await fetch(AppleOAuthProvider.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    // Apple doesn't have a userinfo endpoint like other providers.
    // User info is included in the ID token returned during token exchange.
    // This method should parse the ID token instead.
    throw new Error(
      'Apple Sign In requires ID token verification. Use verifyIdToken instead.'
    );
  }

  async verifyIdToken(idToken: string): Promise<OAuthUserInfo> {
    // Parse the JWT (in production, this should verify the signature)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid ID token format');
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    // Verify claims
    if (payload.iss !== 'https://appleid.apple.com') {
      throw new Error('Invalid token issuer');
    }

    if (payload.aud !== this.config.clientId) {
      throw new Error('Invalid token audience');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error('Token has expired');
    }

    return {
      externalId: payload.sub,
      email: payload.email,
      name: payload.email?.split('@')[0] || 'Apple User',
      emailVerified: payload.email_verified === 'true',
    };
  }

  private async generateClientSecret(): Promise<string> {
    // In production, this would generate a signed JWT client secret
    // using the team ID, key ID, and private key.
    // For now, return a placeholder that would be replaced with actual implementation.

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.config.teamId,
      iat: now,
      exp: now + 15777000, // ~6 months
      aud: 'https://appleid.apple.com',
      sub: this.config.clientId,
    };

    // This is a simplified version - real implementation would sign with ES256
    // using the private key
    const header = { alg: 'ES256', kid: this.config.keyId };
    const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // In production, this would be a proper signature
    return `${headerBase64}.${payloadBase64}.placeholder-signature`;
  }
}
