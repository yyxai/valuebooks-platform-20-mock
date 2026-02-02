import { describe, it, expect } from 'vitest';
import { Role } from './Role.js';
import { Permission } from './value-objects/Permission.js';
import { UserType } from './UserType.js';

describe('Role', () => {
  const readPermission = new Permission('listings:read');
  const writePermission = new Permission('listings:write');

  describe('create', () => {
    it('should create a role with valid properties', () => {
      const role = Role.create({
        name: 'Buyer',
        description: 'Can buy books',
        permissions: [readPermission],
        applicableUserTypes: [UserType.CONSUMER],
      });

      expect(role.id).toBeDefined();
      expect(role.name).toBe('Buyer');
      expect(role.description).toBe('Can buy books');
      expect(role.permissions).toHaveLength(1);
      expect(role.applicableUserTypes).toEqual([UserType.CONSUMER]);
      expect(role.isSystem).toBe(false);
      expect(role.createdAt).toBeInstanceOf(Date);
      expect(role.updatedAt).toBeInstanceOf(Date);
    });

    it('should trim name and description', () => {
      const role = Role.create({
        name: '  Buyer  ',
        description: '  Can buy books  ',
        permissions: [],
        applicableUserTypes: [UserType.CONSUMER],
      });

      expect(role.name).toBe('Buyer');
      expect(role.description).toBe('Can buy books');
    });

    it('should throw for empty name', () => {
      expect(() =>
        Role.create({
          name: '',
          permissions: [],
          applicableUserTypes: [UserType.CONSUMER],
        })
      ).toThrow('Role name cannot be empty');
    });

    it('should throw for no applicable user types', () => {
      expect(() =>
        Role.create({
          name: 'Test',
          permissions: [],
          applicableUserTypes: [],
        })
      ).toThrow('Role must be applicable to at least one user type');
    });
  });

  describe('createSystem', () => {
    it('should create a system role', () => {
      const role = Role.createSystem({
        id: 'system-buyer',
        name: 'Buyer',
        permissions: [readPermission],
        applicableUserTypes: [UserType.CONSUMER],
      });

      expect(role.id).toBe('system-buyer');
      expect(role.isSystem).toBe(true);
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct a role from stored data', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');

      const role = Role.reconstruct({
        id: 'role-123',
        name: 'Buyer',
        description: 'Can buy books',
        permissions: [readPermission],
        applicableUserTypes: [UserType.CONSUMER],
        isSystem: false,
        createdAt,
        updatedAt,
      });

      expect(role.id).toBe('role-123');
      expect(role.name).toBe('Buyer');
      expect(role.createdAt).toBe(createdAt);
      expect(role.updatedAt).toBe(updatedAt);
    });
  });

  describe('hasPermission', () => {
    it('should return true for matching permission', () => {
      const role = Role.create({
        name: 'Test',
        permissions: [readPermission],
        applicableUserTypes: [UserType.CONSUMER],
      });

      expect(role.hasPermission(new Permission('listings:read'))).toBe(true);
    });

    it('should return false for non-matching permission', () => {
      const role = Role.create({
        name: 'Test',
        permissions: [readPermission],
        applicableUserTypes: [UserType.CONSUMER],
      });

      expect(role.hasPermission(new Permission('listings:write'))).toBe(false);
    });

    it('should match wildcard permissions', () => {
      const role = Role.create({
        name: 'Admin',
        permissions: [new Permission('listings:*')],
        applicableUserTypes: [UserType.EMPLOYEE],
      });

      expect(role.hasPermission(new Permission('listings:read'))).toBe(true);
      expect(role.hasPermission(new Permission('listings:write'))).toBe(true);
      expect(role.hasPermission(new Permission('listings:delete'))).toBe(true);
    });
  });

  describe('isApplicableToUserType', () => {
    it('should return true for applicable user type', () => {
      const role = Role.create({
        name: 'Test',
        permissions: [],
        applicableUserTypes: [UserType.CONSUMER, UserType.BUSINESS_PARTNER],
      });

      expect(role.isApplicableToUserType(UserType.CONSUMER)).toBe(true);
      expect(role.isApplicableToUserType(UserType.BUSINESS_PARTNER)).toBe(true);
    });

    it('should return false for non-applicable user type', () => {
      const role = Role.create({
        name: 'Test',
        permissions: [],
        applicableUserTypes: [UserType.CONSUMER],
      });

      expect(role.isApplicableToUserType(UserType.EMPLOYEE)).toBe(false);
    });
  });

  describe('updateName', () => {
    it('should update name for non-system role', () => {
      const role = Role.create({
        name: 'Old Name',
        permissions: [],
        applicableUserTypes: [UserType.CONSUMER],
      });
      const originalUpdatedAt = role.updatedAt;

      role.updateName('New Name');

      expect(role.name).toBe('New Name');
      expect(role.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime()
      );
    });

    it('should throw for system role', () => {
      const role = Role.createSystem({
        id: 'system-role',
        name: 'System Role',
        permissions: [],
        applicableUserTypes: [UserType.EMPLOYEE],
      });

      expect(() => role.updateName('New Name')).toThrow('Cannot modify system role');
    });

    it('should throw for empty name', () => {
      const role = Role.create({
        name: 'Test',
        permissions: [],
        applicableUserTypes: [UserType.CONSUMER],
      });

      expect(() => role.updateName('')).toThrow('Role name cannot be empty');
    });
  });

  describe('addPermission', () => {
    it('should add a new permission', () => {
      const role = Role.create({
        name: 'Test',
        permissions: [readPermission],
        applicableUserTypes: [UserType.CONSUMER],
      });

      role.addPermission(writePermission);

      expect(role.permissions).toHaveLength(2);
      expect(role.hasPermission(writePermission)).toBe(true);
    });

    it('should not add duplicate permission', () => {
      const role = Role.create({
        name: 'Test',
        permissions: [readPermission],
        applicableUserTypes: [UserType.CONSUMER],
      });

      role.addPermission(new Permission('listings:read'));

      expect(role.permissions).toHaveLength(1);
    });

    it('should throw for system role', () => {
      const role = Role.createSystem({
        id: 'system-role',
        name: 'System Role',
        permissions: [],
        applicableUserTypes: [UserType.EMPLOYEE],
      });

      expect(() => role.addPermission(readPermission)).toThrow(
        'Cannot modify system role'
      );
    });
  });

  describe('removePermission', () => {
    it('should remove an existing permission', () => {
      const role = Role.create({
        name: 'Test',
        permissions: [readPermission, writePermission],
        applicableUserTypes: [UserType.CONSUMER],
      });

      role.removePermission(readPermission);

      expect(role.permissions).toHaveLength(1);
      expect(role.hasPermission(readPermission)).toBe(false);
    });
  });
});
