import { OAuthProvider, OAuthTokens, OAuthUserInfo } from './OAuthProvider.js';

export interface AmazonOAuthConfig {
  clientId: string;
  clientSecret: string;
}

export class AmazonOAuthProvider implements OAuthProvider {
  private static readonly AUTH_URL = 'https://www.amazon.com/ap/oa';
  private static readonly TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
  private static readonly USERINFO_URL = 'https://api.amazon.com/user/profile';

  constructor(private config: AmazonOAuthConfig) {}

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'profile',
      state,
    });

    return `${AmazonOAuthProvider.AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<OAuthTokens> {
    const response = await fetch(AmazonOAuthProvider.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
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
    const response = await fetch(AmazonOAuthProvider.USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user info: ${error}`);
    }

    const data = await response.json();

    return {
      externalId: data.user_id,
      email: data.email,
      name: data.name || data.email?.split('@')[0] || 'Amazon User',
      emailVerified: true, // Amazon verifies emails
    };
  }
}
