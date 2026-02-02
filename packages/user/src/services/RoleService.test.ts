import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@valuebooks/shared';
import { RoleService } from './RoleService.js';
import { InMemoryUserRepository } from '../infrastructure/InMemoryUserRepository.js';
import { InMemoryRoleRepository } from '../infrastructure/InMemoryRoleRepository.js';
import { User } from '../domain/User.js';
import { Email } from '../domain/value-objects/Email.js';
import { HashedPassword } from '../domain/value-objects/HashedPassword.js';
import { UserProfile } from '../domain/value-objects/UserProfile.js';
import { AuthProvider } from '../domain/value-objects/AuthProvider.js';
import { UserType, UserTypeValue } from '../domain/UserType.js';
import { UserEventTypes } from '../domain/events/index.js';
import { SystemRoleIds } from '../domain/SystemRoles.js';

describe('RoleService', () => {
  let service: RoleService;
  let roleRepository: InMemoryRoleRepository;
  let userRepository: InMemoryUserRepository;
  let eventBus: EventBus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let publishSpy: any;
  let testUser: User;

  const createTestUser = async (userType: UserTypeValue = UserType.CONSUMER) => {
    const email =
      userType === UserType.EMPLOYEE
        ? 'employee@valuebooks.co.jp'
        : 'user@example.com';
    const user = User.create({
      email: new Email(email),
      password: new HashedPassword('hash', 'salt'),
      userType,
      authProvider: AuthProvider.email(),
      profile: new UserProfile({ name: 'Test User' }),
    });
    await userRepository.save(user);
    return user;
  };

  beforeEach(async () => {
    roleRepository = new InMemoryRoleRepository();
    userRepository = new InMemoryUserRepository();
    eventBus = new EventBus();
    publishSpy = vi.spyOn(eventBus, 'publish');

    service = new RoleService(roleRepository, userRepository, eventBus);
    testUser = await createTestUser();
  });

  describe('getById', () => {
    it('should return role by ID', async () => {
      const role = await service.getById(SystemRoleIds.BUYER);

      expect(role).not.toBeNull();
      expect(role?.name).toBe('Buyer');
    });

    it('should return null for non-existent ID', async () => {
      const role = await service.getById('non-existent');

      expect(role).toBeNull();
    });
  });

  describe('getByName', () => {
    it('should return role by name', async () => {
      const role = await service.getByName('Buyer');

      expect(role).not.toBeNull();
      expect(role?.id).toBe(SystemRoleIds.BUYER);
    });

    it('should return null for non-existent name', async () => {
      const role = await service.getByName('NonExistent');

      expect(role).toBeNull();
    });
  });

  describe('listRoles', () => {
    it('should return all roles including system roles', async () => {
      const roles = await service.listRoles();

      expect(roles.length).toBeGreaterThan(0);
      expect(roles.some((r) => r.isSystem)).toBe(true);
    });
  });

  describe('createRole', () => {
    it('should create a new role', async () => {
      const role = await service.createRole({
        name: 'Custom Role',
        description: 'A custom role',
        permissions: ['listings:read', 'orders:read'],
        applicableUserTypes: [UserType.CONSUMER],
      });

      expect(role.name).toBe('Custom Role');
      expect(role.description).toBe('A custom role');
      expect(role.permissions).toHaveLength(2);
      expect(role.isSystem).toBe(false);
    });

    it('should throw for duplicate name', async () => {
      await service.createRole({
        name: 'Unique Role',
        permissions: [],
        applicableUserTypes: [UserType.CONSUMER],
      });

      await expect(
        service.createRole({
          name: 'Unique Role',
          permissions: [],
          applicableUserTypes: [UserType.CONSUMER],
        })
      ).rejects.toThrow('Role with this name already exists');
    });
  });

  describe('updateRole', () => {
    let customRole: Awaited<ReturnType<typeof service.createRole>>;

    beforeEach(async () => {
      customRole = await service.createRole({
        name: 'Editable Role',
        permissions: ['listings:read'],
        applicableUserTypes: [UserType.CONSUMER],
      });
    });

    it('should update role name', async () => {
      const updated = await service.updateRole(customRole.id, {
        name: 'Renamed Role',
      });

      expect(updated.name).toBe('Renamed Role');
    });

    it('should update role permissions', async () => {
      const updated = await service.updateRole(customRole.id, {
        permissions: ['orders:read', 'orders:write'],
      });

      expect(updated.permissions).toHaveLength(2);
    });

    it('should throw for system role', async () => {
      await expect(
        service.updateRole(SystemRoleIds.BUYER, { name: 'New Name' })
      ).rejects.toThrow('Cannot modify system role');
    });

    it('should throw for non-existent role', async () => {
      await expect(
        service.updateRole('non-existent', { name: 'New Name' })
      ).rejects.toThrow('Role not found');
    });

    it('should throw for duplicate name', async () => {
      await service.createRole({
        name: 'Another Role',
        permissions: [],
        applicableUserTypes: [UserType.CONSUMER],
      });

      await expect(
        service.updateRole(customRole.id, { name: 'Another Role' })
      ).rejects.toThrow('Role with this name already exists');
    });
  });

  describe('deleteRole', () => {
    it('should delete custom role', async () => {
      const role = await service.createRole({
        name: 'Deletable Role',
        permissions: [],
        applicableUserTypes: [UserType.CONSUMER],
      });

      await service.deleteRole(role.id);

      const deleted = await service.getById(role.id);
      expect(deleted).toBeNull();
    });

    it('should throw for system role', async () => {
      await expect(service.deleteRole(SystemRoleIds.BUYER)).rejects.toThrow(
        'Cannot delete system role'
      );
    });

    it('should throw for non-existent role', async () => {
      await expect(service.deleteRole('non-existent')).rejects.toThrow(
        'Role not found'
      );
    });
  });

  describe('assignRoleToUser', () => {
    it('should assign role to user', async () => {
      await service.assignRoleToUser({
        userId: testUser.id.value,
        roleId: SystemRoleIds.BUYER,
      });

      const user = await userRepository.findById(testUser.id.value);
      expect(user?.hasRole(SystemRoleIds.BUYER)).toBe(true);
    });

    it('should publish RoleAssigned event', async () => {
      await service.assignRoleToUser({
        userId: testUser.id.value,
        roleId: SystemRoleIds.BUYER,
      });

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: UserEventTypes.ROLE_ASSIGNED,
          payload: expect.objectContaining({
            userId: testUser.id.value,
            roleId: SystemRoleIds.BUYER,
          }),
        })
      );
    });

    it('should throw for non-applicable role', async () => {
      const employeeUser = await createTestUser(UserType.EMPLOYEE);

      // Buyer role is for consumers only
      await expect(
        service.assignRoleToUser({
          userId: employeeUser.id.value,
          roleId: SystemRoleIds.BUYER,
        })
      ).rejects.toThrow('is not applicable to user type');
    });

    it('should throw for non-existent user', async () => {
      await expect(
        service.assignRoleToUser({
          userId: 'non-existent',
          roleId: SystemRoleIds.BUYER,
        })
      ).rejects.toThrow('User not found');
    });

    it('should throw for non-existent role', async () => {
      await expect(
        service.assignRoleToUser({
          userId: testUser.id.value,
          roleId: 'non-existent',
        })
      ).rejects.toThrow('Role not found');
    });
  });

  describe('removeRoleFromUser', () => {
    beforeEach(async () => {
      await service.assignRoleToUser({
        userId: testUser.id.value,
        roleId: SystemRoleIds.BUYER,
      });
    });

    it('should remove role from user', async () => {
      await service.removeRoleFromUser(testUser.id.value, SystemRoleIds.BUYER);

      const user = await userRepository.findById(testUser.id.value);
      expect(user?.hasRole(SystemRoleIds.BUYER)).toBe(false);
    });

    it('should publish RoleRemoved event', async () => {
      publishSpy.mockClear();

      await service.removeRoleFromUser(testUser.id.value, SystemRoleIds.BUYER);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: UserEventTypes.ROLE_REMOVED,
        })
      );
    });

    it('should throw if user does not have role', async () => {
      await service.removeRoleFromUser(testUser.id.value, SystemRoleIds.BUYER);

      await expect(
        service.removeRoleFromUser(testUser.id.value, SystemRoleIds.BUYER)
      ).rejects.toThrow('User does not have this role');
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles', async () => {
      await service.assignRoleToUser({
        userId: testUser.id.value,
        roleId: SystemRoleIds.BUYER,
      });
      await service.assignRoleToUser({
        userId: testUser.id.value,
        roleId: SystemRoleIds.SELLER,
      });

      const roles = await service.getUserRoles(testUser.id.value);

      expect(roles).toHaveLength(2);
      expect(roles.some((r) => r.id === SystemRoleIds.BUYER)).toBe(true);
      expect(roles.some((r) => r.id === SystemRoleIds.SELLER)).toBe(true);
    });

    it('should throw for non-existent user', async () => {
      await expect(service.getUserRoles('non-existent')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('getUserPermissions', () => {
    it('should return aggregated permissions from all roles', async () => {
      await service.assignRoleToUser({
        userId: testUser.id.value,
        roleId: SystemRoleIds.BUYER,
      });

      const permissions = await service.getUserPermissions(testUser.id.value);

      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.some((p) => p.value === 'listings:read')).toBe(true);
    });

    it('should deduplicate permissions across roles', async () => {
      await service.assignRoleToUser({
        userId: testUser.id.value,
        roleId: SystemRoleIds.BUYER,
      });
      await service.assignRoleToUser({
        userId: testUser.id.value,
        roleId: SystemRoleIds.SELLER,
      });

      const permissions = await service.getUserPermissions(testUser.id.value);

      // Count occurrences of listings:read
      const listingsReadCount = permissions.filter(
        (p) => p.value === 'listings:read'
      ).length;
      expect(listingsReadCount).toBe(1);
    });
  });

  describe('userHasPermission', () => {
    beforeEach(async () => {
      await service.assignRoleToUser({
        userId: testUser.id.value,
        roleId: SystemRoleIds.BUYER,
      });
    });

    it('should return true for granted permission', async () => {
      const hasPermission = await service.userHasPermission(
        testUser.id.value,
        'listings:read'
      );

      expect(hasPermission).toBe(true);
    });

    it('should return false for non-granted permission', async () => {
      const hasPermission = await service.userHasPermission(
        testUser.id.value,
        'admin:delete'
      );

      expect(hasPermission).toBe(false);
    });

    it('should handle wildcard permissions', async () => {
      const employeeUser = await createTestUser(UserType.EMPLOYEE);
      await service.assignRoleToUser({
        userId: employeeUser.id.value,
        roleId: SystemRoleIds.ADMIN,
      });

      const hasPermission = await service.userHasPermission(
        employeeUser.id.value,
        'admin:anything'
      );

      expect(hasPermission).toBe(true);
    });
  });
});
