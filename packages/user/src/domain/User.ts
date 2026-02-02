import { UserId } from './value-objects/UserId.js';
import { Email } from './value-objects/Email.js';
import { HashedPassword } from './value-objects/HashedPassword.js';
import { UserProfile } from './value-objects/UserProfile.js';
import { AuthProvider, AuthProviderType } from './value-objects/AuthProvider.js';
import { UserStatus, UserStatusValue } from './UserStatus.js';
import { UserType, UserTypeValue } from './UserType.js';
import { RoleAssignment } from './RoleAssignment.js';

export interface CreateUserProps {
  email: Email;
  password?: HashedPassword;
  userType: UserTypeValue;
  authProvider: AuthProvider;
  profile: UserProfile;
  employeeInfo?: EmployeeInfo;
  partnerInfo?: PartnerInfo;
}

export interface ReconstructUserProps {
  id: UserId;
  email: Email;
  password?: HashedPassword;
  userType: UserTypeValue;
  authProvider: AuthProvider;
  status: UserStatusValue;
  profile: UserProfile;
  employeeInfo?: EmployeeInfo;
  partnerInfo?: PartnerInfo;
  roleAssignments: RoleAssignment[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface EmployeeInfo {
  department?: string;
  title?: string;
}

export interface PartnerInfo {
  companyName?: string;
}

export class User {
  public readonly id: UserId;
  public email: Email;
  public password?: HashedPassword;
  public readonly userType: UserTypeValue;
  public authProvider: AuthProvider;
  public status: UserStatusValue;
  public profile: UserProfile;
  public employeeInfo?: EmployeeInfo;
  public partnerInfo?: PartnerInfo;
  public roleAssignments: RoleAssignment[];
  public readonly createdAt: Date;
  public updatedAt: Date;
  public lastLoginAt?: Date;

  private constructor(
    id: UserId,
    email: Email,
    userType: UserTypeValue,
    authProvider: AuthProvider,
    status: UserStatusValue,
    profile: UserProfile,
    createdAt: Date,
    updatedAt: Date,
    password?: HashedPassword,
    employeeInfo?: EmployeeInfo,
    partnerInfo?: PartnerInfo,
    roleAssignments: RoleAssignment[] = [],
    lastLoginAt?: Date
  ) {
    this.id = id;
    this.email = email;
    this.password = password;
    this.userType = userType;
    this.authProvider = authProvider;
    this.status = status;
    this.profile = profile;
    this.employeeInfo = employeeInfo;
    this.partnerInfo = partnerInfo;
    this.roleAssignments = roleAssignments;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.lastLoginAt = lastLoginAt;
  }

  static create(props: CreateUserProps): User {
    const id = UserId.generate();
    const now = new Date();

    // Validate employee domain restriction
    if (props.userType === UserType.EMPLOYEE && !props.email.isEmployeeDomain()) {
      throw new Error('Employee accounts require a company email domain');
    }

    // Validate password requirement for email auth
    if (
      props.authProvider.type === AuthProviderType.EMAIL &&
      !props.password
    ) {
      throw new Error('Password is required for email authentication');
    }

    // Determine initial status
    const initialStatus =
      props.authProvider.type === AuthProviderType.EMAIL
        ? UserStatus.PENDING_VERIFICATION
        : UserStatus.ACTIVE; // OAuth users are auto-verified

    return new User(
      id,
      props.email,
      props.userType,
      props.authProvider,
      initialStatus,
      props.profile,
      now,
      now,
      props.password,
      props.employeeInfo,
      props.partnerInfo
    );
  }

  static reconstruct(props: ReconstructUserProps): User {
    return new User(
      props.id,
      props.email,
      props.userType,
      props.authProvider,
      props.status,
      props.profile,
      props.createdAt,
      props.updatedAt,
      props.password,
      props.employeeInfo,
      props.partnerInfo,
      props.roleAssignments,
      props.lastLoginAt
    );
  }

  verify(): void {
    if (this.status !== UserStatus.PENDING_VERIFICATION) {
      throw new Error('User is not pending verification');
    }
    this.status = UserStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  suspend(reason?: string): void {
    if (this.status === UserStatus.DEACTIVATED) {
      throw new Error('Cannot suspend deactivated user');
    }
    if (this.status === UserStatus.SUSPENDED) {
      throw new Error('User is already suspended');
    }
    this.status = UserStatus.SUSPENDED;
    this.updatedAt = new Date();
  }

  reactivate(): void {
    if (this.status !== UserStatus.SUSPENDED) {
      throw new Error('Can only reactivate suspended users');
    }
    this.status = UserStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    if (this.status === UserStatus.DEACTIVATED) {
      throw new Error('User is already deactivated');
    }
    this.status = UserStatus.DEACTIVATED;
    this.updatedAt = new Date();
  }

  updateProfile(profile: UserProfile): void {
    this.profile = profile;
    this.updatedAt = new Date();
  }

  updatePassword(password: HashedPassword): void {
    if (this.authProvider.isOAuth()) {
      throw new Error('Cannot set password for OAuth users');
    }
    this.password = password;
    this.updatedAt = new Date();
  }

  recordLogin(): void {
    this.lastLoginAt = new Date();
    this.updatedAt = new Date();
  }

  assignRole(assignment: RoleAssignment): void {
    // Check if role is already assigned
    const existingIndex = this.roleAssignments.findIndex(
      (ra) => ra.roleId === assignment.roleId
    );

    if (existingIndex >= 0) {
      // Replace existing assignment
      this.roleAssignments[existingIndex] = assignment;
    } else {
      this.roleAssignments.push(assignment);
    }
    this.updatedAt = new Date();
  }

  removeRole(roleId: string): void {
    this.roleAssignments = this.roleAssignments.filter(
      (ra) => ra.roleId !== roleId
    );
    this.updatedAt = new Date();
  }

  hasRole(roleId: string): boolean {
    return this.roleAssignments.some(
      (ra) => ra.roleId === roleId && ra.isActive()
    );
  }

  getActiveRoleIds(): string[] {
    return this.roleAssignments
      .filter((ra) => ra.isActive())
      .map((ra) => ra.roleId);
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  canLogin(): boolean {
    return (
      this.status === UserStatus.ACTIVE ||
      this.status === UserStatus.PENDING_VERIFICATION
    );
  }
}
