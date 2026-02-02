export interface OAuthUserInfo {
  externalId: string;
  email: string;
  name: string;
  emailVerified?: boolean;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
}

export interface OAuthProvider {
  /**
   * Get the authorization URL for initiating OAuth flow
   */
  getAuthorizationUrl(state: string, redirectUri: string): string;

  /**
   * Exchange authorization code for tokens
   */
  exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<OAuthTokens>;

  /**
   * Get user info using the access token
   */
  getUserInfo(accessToken: string): Promise<OAuthUserInfo>;

  /**
   * Verify an ID token (for providers that support it)
   */
  verifyIdToken?(idToken: string): Promise<OAuthUserInfo>;
}
