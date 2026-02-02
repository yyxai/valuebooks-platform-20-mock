import { OAuthProvider, OAuthTokens, OAuthUserInfo } from './OAuthProvider.js';

export interface FacebookOAuthConfig {
  clientId: string;
  clientSecret: string;
}

export class FacebookOAuthProvider implements OAuthProvider {
  private static readonly AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';
  private static readonly TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
  private static readonly USERINFO_URL = 'https://graph.facebook.com/v18.0/me';

  constructor(private config: FacebookOAuthConfig) {}

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email,public_profile',
      state,
    });

    return `${FacebookOAuthProvider.AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(
      `${FacebookOAuthProvider.TOKEN_URL}?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'Bearer',
    };
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    const params = new URLSearchParams({
      fields: 'id,name,email',
      access_token: accessToken,
    });

    const response = await fetch(
      `${FacebookOAuthProvider.USERINFO_URL}?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user info: ${error}`);
    }

    const data = await response.json();

    if (!data.email) {
      throw new Error('Email not provided. User may not have granted email permission.');
    }

    return {
      externalId: data.id,
      email: data.email,
      name: data.name || data.email.split('@')[0],
      emailVerified: true, // Facebook verifies emails
    };
  }
}
