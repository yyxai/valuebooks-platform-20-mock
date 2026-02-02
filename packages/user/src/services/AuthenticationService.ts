import { EventBus } from '@valuebooks/shared';
import { User } from '../domain/User.js';
import { Email } from '../domain/value-objects/Email.js';
import { UserProfile } from '../domain/value-objects/UserProfile.js';
import { AuthProvider, AuthProviderTypeValue } from '../domain/value-objects/AuthProvider.js';
import { UserType, UserTypeValue } from '../domain/UserType.js';
import { UserEventTypes } from '../domain/events/index.js';
import { UserRepository } from '../infrastructure/UserRepository.js';
import { RoleRepository } from '../infrastructure/RoleRepository.js';
import { RefreshTokenRepository } from '../infrastructure/RefreshTokenRepository.js';
import { JwtService, TokenPair } from '../infrastructure/jwt.js';
import { hashPassword, verifyPassword } from '../infrastructure/password.js';
import { SystemRoleIds } from '../domain/SystemRoles.js';
import { RoleAssignment } from '../domain/RoleAssignment.js';

export interface RegisterUserInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  userType?: UserTypeValue;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface OAuthLoginInput {
  provider: AuthProviderTypeValue;
  externalId: string;
  email: string;
  name: string;
}

export interface AuthResult {
  user: User;
  tokens: TokenPair;
}

export class AuthenticationService {
  constructor(
    private userRepository: UserRepository,
    private roleRepository: RoleRepository,
    private refreshTokenRepository: RefreshTokenRepository,
    private jwtService: JwtService,
    private eventBus: EventBus
  ) {}

  async register(input: RegisterUserInput): Promise<AuthResult> {
    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create user
    const email = new Email(input.email);
    const userType = input.userType ?? UserType.CONSUMER;

    // Validate employee domain
    if (userType === UserType.EMPLOYEE && !email.isEmployeeDomain()) {
      throw new Error('Employee accounts require a company email domain');
    }

    const user = User.create({
      email,
      password: hashedPassword,
      userType,
      authProvider: AuthProvider.email(),
      profile: new UserProfile({ name: input.name, phone: input.phone }),
    });

    // Assign default role based on user type
    await this.assignDefaultRole(user);

    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokensForUser(user);

    // Publish event
    this.eventBus.publish({
      type: UserEventTypes.REGISTERED,
      payload: {
        userId: user.id.value,
        email: user.email.value,
        userType: user.userType,
        authProvider: user.authProvider.type,
        name: user.profile.name,
      },
      timestamp: new Date(),
    });

    return { user, tokens };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.canLogin()) {
      throw new Error('Account is not active');
    }

    if (!user.password) {
      throw new Error('Invalid credentials');
    }

    const isValid = await verifyPassword(input.password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    user.recordLogin();
    await this.userRepository.save(user);

    const tokens = await this.generateTokensForUser(user);

    this.eventBus.publish({
      type: UserEventTypes.LOGGED_IN,
      payload: {
        userId: user.id.value,
        email: user.email.value,
        authProvider: user.authProvider.type,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    });

    return { user, tokens };
  }

  async oauthLogin(input: OAuthLoginInput): Promise<AuthResult> {
    // Check if user exists by OAuth provider
    let user = await this.userRepository.findByAuthProviderExternalId(
      input.provider,
      input.externalId
    );

    if (!user) {
      // Check if email exists (link accounts)
      const existingUser = await this.userRepository.findByEmail(input.email);
      if (existingUser) {
        throw new Error(
          'Email already registered. Please login with your existing account.'
        );
      }

      // Create new user
      const authProvider = this.createAuthProvider(
        input.provider,
        input.externalId
      );

      user = User.create({
        email: new Email(input.email),
        userType: UserType.CONSUMER,
        authProvider,
        profile: new UserProfile({ name: input.name }),
      });

      await this.assignDefaultRole(user);
      await this.userRepository.save(user);

      this.eventBus.publish({
        type: UserEventTypes.REGISTERED,
        payload: {
          userId: user.id.value,
          email: user.email.value,
          userType: user.userType,
          authProvider: user.authProvider.type,
          name: user.profile.name,
        },
        timestamp: new Date(),
      });
    }

    if (!user.canLogin()) {
      throw new Error('Account is not active');
    }

    user.recordLogin();
    await this.userRepository.save(user);

    const tokens = await this.generateTokensForUser(user);

    this.eventBus.publish({
      type: UserEventTypes.LOGGED_IN,
      payload: {
        userId: user.id.value,
        email: user.email.value,
        authProvider: user.authProvider.type,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    });

    return { user, tokens };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = await this.jwtService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    // Check if token is revoked
    const storedToken = await this.refreshTokenRepository.findByJti(
      payload.jti
    );
    if (!storedToken || storedToken.revokedAt) {
      throw new Error('Refresh token has been revoked');
    }

    // Get user
    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.canLogin()) {
      throw new Error('User not found or inactive');
    }

    // Revoke old token
    await this.refreshTokenRepository.revoke(payload.jti);

    // Generate new tokens
    return this.generateTokensForUser(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = await this.jwtService.verifyRefreshToken(refreshToken);
    if (payload) {
      await this.refreshTokenRepository.revoke(payload.jti);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeAllForUser(userId);
  }

  async verifyEmail(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.verify();
    await this.userRepository.save(user);

    this.eventBus.publish({
      type: UserEventTypes.VERIFIED,
      payload: {
        userId: user.id.value,
        email: user.email.value,
      },
      timestamp: new Date(),
    });

    return user;
  }

  private async generateTokensForUser(user: User): Promise<TokenPair> {
    const roles = user.getActiveRoleIds();
    const tokens = await this.jwtService.generateTokenPair(
      user.id.value,
      user.email.value,
      user.userType,
      roles
    );

    // Store refresh token
    await this.refreshTokenRepository.save({
      jti: tokens.refreshTokenJti,
      userId: user.id.value,
      issuedAt: new Date(),
      expiresAt: tokens.refreshTokenExpiresAt,
    });

    return tokens;
  }

  private async assignDefaultRole(user: User): Promise<void> {
    let defaultRoleId: string;

    switch (user.userType) {
      case UserType.CONSUMER:
        defaultRoleId = SystemRoleIds.BUYER;
        break;
      case UserType.BUSINESS_PARTNER:
        defaultRoleId = SystemRoleIds.PARTNER;
        break;
      case UserType.EMPLOYEE:
        // Employees don't get a default role
        return;
      default:
        return;
    }

    const role = await this.roleRepository.findById(defaultRoleId);
    if (role) {
      const assignment = RoleAssignment.create({
        userId: user.id.value,
        roleId: role.id,
      });
      user.assignRole(assignment);
    }
  }

  private createAuthProvider(
    provider: AuthProviderTypeValue,
    externalId: string
  ): AuthProvider {
    switch (provider) {
      case 'google':
        return AuthProvider.google(externalId);
      case 'apple':
        return AuthProvider.apple(externalId);
      case 'amazon':
        return AuthProvider.amazon(externalId);
      case 'facebook':
        return AuthProvider.facebook(externalId);
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
  }
}
