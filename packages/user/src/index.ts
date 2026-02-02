// Domain
export { User } from './domain/User.js';
export type { CreateUserProps, ReconstructUserProps, EmployeeInfo, PartnerInfo } from './domain/User.js';
export { Role } from './domain/Role.js';
export type { CreateRoleProps, ReconstructRoleProps } from './domain/Role.js';
export { RoleAssignment } from './domain/RoleAssignment.js';
export type { CreateRoleAssignmentProps, ReconstructRoleAssignmentProps } from './domain/RoleAssignment.js';
export { UserStatus } from './domain/UserStatus.js';
export type { UserStatusValue } from './domain/UserStatus.js';
export { UserType } from './domain/UserType.js';
export type { UserTypeValue } from './domain/UserType.js';
export { SystemRoles, SystemRoleIds, getAllSystemRoles, getSystemRoleById } from './domain/SystemRoles.js';

// Value Objects
export { UserId } from './domain/value-objects/UserId.js';
export { Email } from './domain/value-objects/Email.js';
export { HashedPassword } from './domain/value-objects/HashedPassword.js';
export { UserProfile } from './domain/value-objects/UserProfile.js';
export type { UserProfileProps } from './domain/value-objects/UserProfile.js';
export { Permission, Permissions } from './domain/value-objects/Permission.js';
export { AuthProvider, AuthProviderType } from './domain/value-objects/AuthProvider.js';
export type { AuthProviderTypeValue } from './domain/value-objects/AuthProvider.js';

// Domain Events
export * from './domain/events/index.js';

// Services
export { AuthenticationService } from './services/AuthenticationService.js';
export type { RegisterUserInput, LoginInput, OAuthLoginInput, AuthResult } from './services/AuthenticationService.js';
export { UserService } from './services/UserService.js';
export type { UpdateProfileInput, ChangePasswordInput, UserSearchCriteria, SearchResult } from './services/UserService.js';
export { RoleService } from './services/RoleService.js';
export type { CreateRoleInput, UpdateRoleInput, AssignRoleInput } from './services/RoleService.js';

// Infrastructure - Repositories
export type { UserRepository } from './infrastructure/UserRepository.js';
export type { RoleRepository } from './infrastructure/RoleRepository.js';
export type { RefreshTokenRepository, RefreshToken } from './infrastructure/RefreshTokenRepository.js';
export { InMemoryUserRepository } from './infrastructure/InMemoryUserRepository.js';
export { InMemoryRoleRepository } from './infrastructure/InMemoryRoleRepository.js';
export { InMemoryRefreshTokenRepository } from './infrastructure/InMemoryRefreshTokenRepository.js';
export { PostgresUserRepository } from './infrastructure/PostgresUserRepository.js';
export { PostgresRoleRepository } from './infrastructure/PostgresRoleRepository.js';
export { PostgresRefreshTokenRepository } from './infrastructure/PostgresRefreshTokenRepository.js';

// Infrastructure - Database
export {
  createConnection,
  getConnection,
  closeConnection,
  healthCheck,
} from './infrastructure/db/connection.js';
export type { DatabaseConfig } from './infrastructure/db/connection.js';

// Infrastructure - JWT
export { JwtService, createDefaultJwtConfig } from './infrastructure/jwt.js';
export type { JwtConfig, AccessTokenPayload, RefreshTokenPayload, TokenPair } from './infrastructure/jwt.js';

// Infrastructure - Password
export { hashPassword, verifyPassword, validatePasswordStrength } from './infrastructure/password.js';
export type { PasswordValidationResult } from './infrastructure/password.js';

// Infrastructure - OAuth Providers
export type { OAuthProvider, OAuthUserInfo, OAuthTokens } from './infrastructure/oauth/OAuthProvider.js';
export { GoogleOAuthProvider } from './infrastructure/oauth/GoogleOAuthProvider.js';
export type { GoogleOAuthConfig } from './infrastructure/oauth/GoogleOAuthProvider.js';
export { AppleOAuthProvider } from './infrastructure/oauth/AppleOAuthProvider.js';
export type { AppleOAuthConfig } from './infrastructure/oauth/AppleOAuthProvider.js';
export { AmazonOAuthProvider } from './infrastructure/oauth/AmazonOAuthProvider.js';
export type { AmazonOAuthConfig } from './infrastructure/oauth/AmazonOAuthProvider.js';
export { FacebookOAuthProvider } from './infrastructure/oauth/FacebookOAuthProvider.js';
export type { FacebookOAuthConfig } from './infrastructure/oauth/FacebookOAuthProvider.js';

// API Routes
export { createUserRoutes } from './api/routes.js';
export type { UserRoutesConfig } from './api/routes.js';

// API Middleware
export { createAuthMiddleware, getAuthContext } from './api/middleware/auth.js';
export type { AuthContext } from './api/middleware/auth.js';
export { createAuthorizationMiddleware, requirePermissions, requireAnyPermission } from './api/middleware/authorization.js';
