export const AuthProviderType = {
  EMAIL: 'email',
  GOOGLE: 'google',
  APPLE: 'apple',
  AMAZON: 'amazon',
  FACEBOOK: 'facebook',
} as const;

export type AuthProviderTypeValue =
  (typeof AuthProviderType)[keyof typeof AuthProviderType];

export class AuthProvider {
  constructor(
    public readonly type: AuthProviderTypeValue,
    public readonly externalId?: string
  ) {
    if (!Object.values(AuthProviderType).includes(type)) {
      throw new Error(`Invalid auth provider type: ${type}`);
    }

    // OAuth providers must have an external ID
    if (type !== AuthProviderType.EMAIL && !externalId) {
      throw new Error(`External ID is required for ${type} auth provider`);
    }
  }

  static email(): AuthProvider {
    return new AuthProvider(AuthProviderType.EMAIL);
  }

  static google(externalId: string): AuthProvider {
    return new AuthProvider(AuthProviderType.GOOGLE, externalId);
  }

  static apple(externalId: string): AuthProvider {
    return new AuthProvider(AuthProviderType.APPLE, externalId);
  }

  static amazon(externalId: string): AuthProvider {
    return new AuthProvider(AuthProviderType.AMAZON, externalId);
  }

  static facebook(externalId: string): AuthProvider {
    return new AuthProvider(AuthProviderType.FACEBOOK, externalId);
  }

  isOAuth(): boolean {
    return this.type !== AuthProviderType.EMAIL;
  }

  equals(other: AuthProvider): boolean {
    return this.type === other.type && this.externalId === other.externalId;
  }
}
