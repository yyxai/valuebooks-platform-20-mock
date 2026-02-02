import { DomainEvent } from '@valuebooks/shared';
import { UserStatusValue } from '../UserStatus.js';
import { UserTypeValue } from '../UserType.js';
import { AuthProviderTypeValue } from '../value-objects/AuthProvider.js';

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  userType: UserTypeValue;
  authProvider: AuthProviderTypeValue;
  name: string;
}

export interface UserVerifiedPayload {
  userId: string;
  email: string;
}

export interface UserLoggedInPayload {
  userId: string;
  email: string;
  authProvider: AuthProviderTypeValue;
  timestamp: Date;
}

export interface UserProfileUpdatedPayload {
  userId: string;
  name: string;
  phone?: string;
}

export interface UserStatusChangedPayload {
  userId: string;
  previousStatus: UserStatusValue;
  newStatus: UserStatusValue;
  reason?: string;
}

export interface UserRoleAssignedPayload {
  userId: string;
  roleId: string;
  roleName: string;
  assignedBy?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface UserRoleRemovedPayload {
  userId: string;
  roleId: string;
  roleName: string;
  removedBy?: string;
}

export interface PasswordResetRequestedPayload {
  userId: string;
  email: string;
  tokenExpiresAt: Date;
}

export interface PasswordResetPayload {
  userId: string;
  email: string;
}

export type UserRegistered = DomainEvent<UserRegisteredPayload>;
export type UserVerified = DomainEvent<UserVerifiedPayload>;
export type UserLoggedIn = DomainEvent<UserLoggedInPayload>;
export type UserProfileUpdated = DomainEvent<UserProfileUpdatedPayload>;
export type UserStatusChanged = DomainEvent<UserStatusChangedPayload>;
export type UserRoleAssigned = DomainEvent<UserRoleAssignedPayload>;
export type UserRoleRemoved = DomainEvent<UserRoleRemovedPayload>;
export type PasswordResetRequested = DomainEvent<PasswordResetRequestedPayload>;
export type PasswordReset = DomainEvent<PasswordResetPayload>;

export const UserEventTypes = {
  REGISTERED: 'UserRegistered',
  VERIFIED: 'UserVerified',
  LOGGED_IN: 'UserLoggedIn',
  PROFILE_UPDATED: 'UserProfileUpdated',
  STATUS_CHANGED: 'UserStatusChanged',
  ROLE_ASSIGNED: 'UserRoleAssigned',
  ROLE_REMOVED: 'UserRoleRemoved',
  PASSWORD_RESET_REQUESTED: 'PasswordResetRequested',
  PASSWORD_RESET: 'PasswordReset',
} as const;
