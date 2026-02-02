import { EventBus } from '@valuebooks/shared';
import { Role } from '../domain/Role.js';
import { RoleAssignment } from '../domain/RoleAssignment.js';
import { Permission } from '../domain/value-objects/Permission.js';
import { UserTypeValue } from '../domain/UserType.js';
import { UserEventTypes } from '../domain/events/index.js';
import { UserRepository } from '../infrastructure/UserRepository.js';
import { RoleRepository } from '../infrastructure/RoleRepository.js';

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: string[];
  applicableUserTypes: UserTypeValue[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface AssignRoleInput {
  userId: string;
  roleId: string;
  assignedBy?: string;
  expiresAt?: Date;
  scope?: string;
}

export class RoleService {
  constructor(
    private roleRepository: RoleRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async getById(roleId: string): Promise<Role | null> {
    return this.roleRepository.findById(roleId);
  }

  async getByName(name: string): Promise<Role | null> {
    return this.roleRepository.findByName(name);
  }

  async listRoles(): Promise<Role[]> {
    return this.roleRepository.findAll();
  }

  async createRole(input: CreateRoleInput): Promise<Role> {
    // Check for duplicate name
    const existingRole = await this.roleRepository.findByName(input.name);
    if (existingRole) {
      throw new Error('Role with this name already exists');
    }

    const permissions = input.permissions.map((p) => new Permission(p));

    const role = Role.create({
      name: input.name,
      description: input.description,
      permissions,
      applicableUserTypes: input.applicableUserTypes,
    });

    await this.roleRepository.save(role);

    return role;
  }

  async updateRole(roleId: string, input: UpdateRoleInput): Promise<Role> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot modify system role');
    }

    if (input.name !== undefined) {
      // Check for duplicate name
      const existingRole = await this.roleRepository.findByName(input.name);
      if (existingRole && existingRole.id !== roleId) {
        throw new Error('Role with this name already exists');
      }
      role.updateName(input.name);
    }

    if (input.description !== undefined) {
      role.updateDescription(input.description);
    }

    if (input.permissions !== undefined) {
      const permissions = input.permissions.map((p) => new Permission(p));
      role.updatePermissions(permissions);
    }

    await this.roleRepository.save(role);

    return role;
  }

  async deleteRole(roleId: string): Promise<void> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system role');
    }

    await this.roleRepository.delete(roleId);
  }

  async assignRoleToUser(input: AssignRoleInput): Promise<void> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const role = await this.roleRepository.findById(input.roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    // Check if role is applicable to user type
    if (!role.isApplicableToUserType(user.userType)) {
      throw new Error(
        `Role "${role.name}" is not applicable to user type "${user.userType}"`
      );
    }

    const assignment = RoleAssignment.create({
      userId: input.userId,
      roleId: input.roleId,
      assignedBy: input.assignedBy,
      expiresAt: input.expiresAt,
      scope: input.scope,
    });

    user.assignRole(assignment);
    await this.userRepository.save(user);

    this.eventBus.publish({
      type: UserEventTypes.ROLE_ASSIGNED,
      payload: {
        userId: user.id.value,
        roleId: role.id,
        roleName: role.name,
        assignedBy: input.assignedBy,
        expiresAt: input.expiresAt,
        scope: input.scope,
      },
      timestamp: new Date(),
    });
  }

  async removeRoleFromUser(
    userId: string,
    roleId: string,
    removedBy?: string
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    if (!user.hasRole(roleId)) {
      throw new Error('User does not have this role');
    }

    user.removeRole(roleId);
    await this.userRepository.save(user);

    this.eventBus.publish({
      type: UserEventTypes.ROLE_REMOVED,
      payload: {
        userId: user.id.value,
        roleId: role.id,
        roleName: role.name,
        removedBy,
      },
      timestamp: new Date(),
    });
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const roleIds = user.getActiveRoleIds();
    return this.roleRepository.findByIds(roleIds);
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const roles = await this.getUserRoles(userId);
    const permissionSet = new Set<string>();
    const permissions: Permission[] = [];

    for (const role of roles) {
      for (const permission of role.permissions) {
        if (!permissionSet.has(permission.value)) {
          permissionSet.add(permission.value);
          permissions.push(permission);
        }
      }
    }

    return permissions;
  }

  async userHasPermission(
    userId: string,
    requiredPermission: string
  ): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    const required = new Permission(requiredPermission);

    for (const role of roles) {
      if (role.hasPermission(required)) {
        return true;
      }
    }

    return false;
  }
}
