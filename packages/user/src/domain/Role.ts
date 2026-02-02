import { Permission } from './value-objects/Permission.js';
import { UserTypeValue } from './UserType.js';

export interface CreateRoleProps {
  name: string;
  description?: string;
  permissions: Permission[];
  applicableUserTypes: UserTypeValue[];
}

export interface ReconstructRoleProps {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  applicableUserTypes: UserTypeValue[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Role {
  public readonly id: string;
  public name: string;
  public description?: string;
  public permissions: Permission[];
  public applicableUserTypes: UserTypeValue[];
  public readonly isSystem: boolean;
  public readonly createdAt: Date;
  public updatedAt: Date;

  private constructor(
    id: string,
    name: string,
    permissions: Permission[],
    applicableUserTypes: UserTypeValue[],
    isSystem: boolean,
    createdAt: Date,
    updatedAt: Date,
    description?: string
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.permissions = permissions;
    this.applicableUserTypes = applicableUserTypes;
    this.isSystem = isSystem;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create(props: CreateRoleProps): Role {
    const id = crypto.randomUUID();
    const now = new Date();

    if (!props.name.trim()) {
      throw new Error('Role name cannot be empty');
    }

    if (props.applicableUserTypes.length === 0) {
      throw new Error('Role must be applicable to at least one user type');
    }

    return new Role(
      id,
      props.name.trim(),
      [...props.permissions],
      [...props.applicableUserTypes],
      false,
      now,
      now,
      props.description?.trim()
    );
  }

  static createSystem(props: CreateRoleProps & { id: string }): Role {
    const now = new Date();

    if (!props.name.trim()) {
      throw new Error('Role name cannot be empty');
    }

    return new Role(
      props.id,
      props.name.trim(),
      [...props.permissions],
      [...props.applicableUserTypes],
      true,
      now,
      now,
      props.description?.trim()
    );
  }

  static reconstruct(props: ReconstructRoleProps): Role {
    return new Role(
      props.id,
      props.name,
      [...props.permissions],
      [...props.applicableUserTypes],
      props.isSystem,
      props.createdAt,
      props.updatedAt,
      props.description
    );
  }

  hasPermission(permission: Permission): boolean {
    return this.permissions.some((p) => p.matches(permission));
  }

  isApplicableToUserType(userType: UserTypeValue): boolean {
    return this.applicableUserTypes.includes(userType);
  }

  updateName(name: string): void {
    if (this.isSystem) {
      throw new Error('Cannot modify system role');
    }
    if (!name.trim()) {
      throw new Error('Role name cannot be empty');
    }
    this.name = name.trim();
    this.updatedAt = new Date();
  }

  updateDescription(description?: string): void {
    if (this.isSystem) {
      throw new Error('Cannot modify system role');
    }
    this.description = description?.trim();
    this.updatedAt = new Date();
  }

  updatePermissions(permissions: Permission[]): void {
    if (this.isSystem) {
      throw new Error('Cannot modify system role');
    }
    this.permissions = [...permissions];
    this.updatedAt = new Date();
  }

  addPermission(permission: Permission): void {
    if (this.isSystem) {
      throw new Error('Cannot modify system role');
    }
    if (!this.permissions.some((p) => p.equals(permission))) {
      this.permissions.push(permission);
      this.updatedAt = new Date();
    }
  }

  removePermission(permission: Permission): void {
    if (this.isSystem) {
      throw new Error('Cannot modify system role');
    }
    this.permissions = this.permissions.filter((p) => !p.equals(permission));
    this.updatedAt = new Date();
  }
}
