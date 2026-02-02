import { describe, it, expect, beforeEach } from 'vitest';
import { User } from './User.js';
import { UserId } from './value-objects/UserId.js';
import { Email } from './value-objects/Email.js';
import { HashedPassword } from './value-objects/HashedPassword.js';
import { UserProfile } from './value-objects/UserProfile.js';
import { AuthProvider } from './value-objects/AuthProvider.js';
import { UserStatus } from './UserStatus.js';
import { UserType } from './UserType.js';
import { RoleAssignment } from './RoleAssignment.js';

describe('User', () => {
  const createTestPassword = () => new HashedPassword('hash123', 'salt456');
  const createTestProfile = () => new UserProfile({ name: 'Test User' });
  const createTestEmail = () => new Email('user@example.com');
  const createEmployeeEmail = () => new Email('employee@valuebooks.co.jp');

  describe('create', () => {
    it('should create a consumer with email auth', () => {
      const user = User.create({
        email: createTestEmail(),
        password: createTestPassword(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.email(),
        profile: createTestProfile(),
      });

      expect(user.id).toBeInstanceOf(UserId);
      expect(user.email.value).toBe('user@example.com');
      expect(user.userType).toBe(UserType.CONSUMER);
      expect(user.status).toBe(UserStatus.PENDING_VERIFICATION);
      expect(user.profile.name).toBe('Test User');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.roleAssignments).toEqual([]);
    });

    it('should create a consumer with OAuth (auto-verified)', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });

      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.authProvider.type).toBe('google');
      expect(user.authProvider.externalId).toBe('google-123');
    });

    it('should create an employee with company email', () => {
      const user = User.create({
        email: createEmployeeEmail(),
        password: createTestPassword(),
        userType: UserType.EMPLOYEE,
        authProvider: AuthProvider.email(),
        profile: createTestProfile(),
        employeeInfo: { department: 'IT', title: 'Developer' },
      });

      expect(user.userType).toBe(UserType.EMPLOYEE);
      expect(user.employeeInfo?.department).toBe('IT');
      expect(user.employeeInfo?.title).toBe('Developer');
    });

    it('should throw for employee with non-company email', () => {
      expect(() =>
        User.create({
          email: createTestEmail(),
          password: createTestPassword(),
          userType: UserType.EMPLOYEE,
          authProvider: AuthProvider.email(),
          profile: createTestProfile(),
        })
      ).toThrow('Employee accounts require a company email domain');
    });

    it('should throw for email auth without password', () => {
      expect(() =>
        User.create({
          email: createTestEmail(),
          userType: UserType.CONSUMER,
          authProvider: AuthProvider.email(),
          profile: createTestProfile(),
        })
      ).toThrow('Password is required for email authentication');
    });

    it('should create a business partner', () => {
      const user = User.create({
        email: createTestEmail(),
        password: createTestPassword(),
        userType: UserType.BUSINESS_PARTNER,
        authProvider: AuthProvider.email(),
        profile: createTestProfile(),
        partnerInfo: { companyName: 'Book Corp' },
      });

      expect(user.userType).toBe(UserType.BUSINESS_PARTNER);
      expect(user.partnerInfo?.companyName).toBe('Book Corp');
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct a user from stored data', () => {
      const id = UserId.generate();
      const email = createTestEmail();
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');

      const user = User.reconstruct({
        id,
        email,
        password: createTestPassword(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.email(),
        status: UserStatus.ACTIVE,
        profile: createTestProfile(),
        roleAssignments: [],
        createdAt,
        updatedAt,
        lastLoginAt: new Date('2024-01-02'),
      });

      expect(user.id).toBe(id);
      expect(user.email).toBe(email);
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.createdAt).toBe(createdAt);
      expect(user.updatedAt).toBe(updatedAt);
    });
  });

  describe('verify', () => {
    it('should verify a pending user', () => {
      const user = User.create({
        email: createTestEmail(),
        password: createTestPassword(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.email(),
        profile: createTestProfile(),
      });

      user.verify();

      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('should throw when verifying non-pending user', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });

      expect(() => user.verify()).toThrow('User is not pending verification');
    });
  });

  describe('suspend', () => {
    it('should suspend an active user', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });

      user.suspend();

      expect(user.status).toBe(UserStatus.SUSPENDED);
    });

    it('should throw when suspending deactivated user', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });
      user.deactivate();

      expect(() => user.suspend()).toThrow('Cannot suspend deactivated user');
    });

    it('should throw when suspending already suspended user', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });
      user.suspend();

      expect(() => user.suspend()).toThrow('User is already suspended');
    });
  });

  describe('reactivate', () => {
    it('should reactivate a suspended user', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });
      user.suspend();

      user.reactivate();

      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('should throw when reactivating non-suspended user', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });

      expect(() => user.reactivate()).toThrow(
        'Can only reactivate suspended users'
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate an active user', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });

      user.deactivate();

      expect(user.status).toBe(UserStatus.DEACTIVATED);
    });

    it('should throw when deactivating already deactivated user', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });
      user.deactivate();

      expect(() => user.deactivate()).toThrow('User is already deactivated');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', () => {
      const user = User.create({
        email: createTestEmail(),
        password: createTestPassword(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.email(),
        profile: createTestProfile(),
      });
      const originalUpdatedAt = user.updatedAt;

      user.updateProfile(new UserProfile({ name: 'New Name', phone: '123' }));

      expect(user.profile.name).toBe('New Name');
      expect(user.profile.phone).toBe('123');
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe('updatePassword', () => {
    it('should update password for email auth user', () => {
      const user = User.create({
        email: createTestEmail(),
        password: createTestPassword(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.email(),
        profile: createTestProfile(),
      });

      user.updatePassword(new HashedPassword('newhash', 'newsalt'));

      expect(user.password?.hash).toBe('newhash');
    });

    it('should throw when updating password for OAuth user', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });

      expect(() =>
        user.updatePassword(new HashedPassword('hash', 'salt'))
      ).toThrow('Cannot set password for OAuth users');
    });
  });

  describe('role management', () => {
    let user: User;

    beforeEach(() => {
      user = User.create({
        email: createTestEmail(),
        password: createTestPassword(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.email(),
        profile: createTestProfile(),
      });
    });

    it('should assign a role', () => {
      const assignment = RoleAssignment.create({
        userId: user.id.value,
        roleId: 'role-buyer',
      });

      user.assignRole(assignment);

      expect(user.roleAssignments).toHaveLength(1);
      expect(user.hasRole('role-buyer')).toBe(true);
    });

    it('should replace existing role assignment', () => {
      const assignment1 = RoleAssignment.create({
        userId: user.id.value,
        roleId: 'role-buyer',
        scope: 'scope1',
      });
      const assignment2 = RoleAssignment.create({
        userId: user.id.value,
        roleId: 'role-buyer',
        scope: 'scope2',
      });

      user.assignRole(assignment1);
      user.assignRole(assignment2);

      expect(user.roleAssignments).toHaveLength(1);
      expect(user.roleAssignments[0].scope).toBe('scope2');
    });

    it('should remove a role', () => {
      const assignment = RoleAssignment.create({
        userId: user.id.value,
        roleId: 'role-buyer',
      });
      user.assignRole(assignment);

      user.removeRole('role-buyer');

      expect(user.roleAssignments).toHaveLength(0);
      expect(user.hasRole('role-buyer')).toBe(false);
    });

    it('should get active role IDs', () => {
      const assignment1 = RoleAssignment.create({
        userId: user.id.value,
        roleId: 'role-buyer',
      });
      const assignment2 = RoleAssignment.create({
        userId: user.id.value,
        roleId: 'role-seller',
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      user.assignRole(assignment1);
      user.assignRole(assignment2);

      const activeRoles = user.getActiveRoleIds();

      expect(activeRoles).toContain('role-buyer');
      expect(activeRoles).not.toContain('role-seller');
    });
  });

  describe('isActive', () => {
    it('should return true for active user', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });

      expect(user.isActive()).toBe(true);
    });

    it('should return false for non-active user', () => {
      const user = User.create({
        email: createTestEmail(),
        password: createTestPassword(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.email(),
        profile: createTestProfile(),
      });

      expect(user.isActive()).toBe(false); // Pending verification
    });
  });

  describe('canLogin', () => {
    it('should return true for active user', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });

      expect(user.canLogin()).toBe(true);
    });

    it('should return true for pending verification user', () => {
      const user = User.create({
        email: createTestEmail(),
        password: createTestPassword(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.email(),
        profile: createTestProfile(),
      });

      expect(user.canLogin()).toBe(true);
    });

    it('should return false for suspended user', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });
      user.suspend();

      expect(user.canLogin()).toBe(false);
    });

    it('should return false for deactivated user', () => {
      const user = User.create({
        email: createTestEmail(),
        userType: UserType.CONSUMER,
        authProvider: AuthProvider.google('google-123'),
        profile: createTestProfile(),
      });
      user.deactivate();

      expect(user.canLogin()).toBe(false);
    });
  });
});
