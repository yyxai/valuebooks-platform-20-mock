import postgres from 'postgres';
import { Role } from '../domain/Role.js';
import { Permission } from '../domain/value-objects/Permission.js';
import type { UserTypeValue } from '../domain/UserType.js';
import type { RoleRepository } from './RoleRepository.js';
import type { RoleRow } from './db/types.js';

export class PostgresRoleRepository implements RoleRepository {
  constructor(private readonly sql: postgres.Sql) {}

  async save(role: Role): Promise<void> {
    const permissions = role.permissions.map((p) => p.value);
    const userTypes = role.applicableUserTypes;

    await this.sql`
      INSERT INTO roles (
        id, name, description, permissions, user_types, is_system,
        created_at, updated_at
      ) VALUES (
        ${role.id},
        ${role.name},
        ${role.description ?? null},
        ${JSON.stringify(permissions)}::jsonb,
        ${JSON.stringify(userTypes)}::jsonb,
        ${role.isSystem},
        ${role.createdAt},
        ${role.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        permissions = EXCLUDED.permissions,
        user_types = EXCLUDED.user_types,
        updated_at = EXCLUDED.updated_at
    `;
  }

  async findById(id: string): Promise<Role | null> {
    const [row] = await this.sql<RoleRow[]>`
      SELECT * FROM roles WHERE id = ${id}
    `;

    if (!row) {
      return null;
    }

    return this.toRole(row);
  }

  async findByName(name: string): Promise<Role | null> {
    const [row] = await this.sql<RoleRow[]>`
      SELECT * FROM roles WHERE name = ${name}
    `;

    if (!row) {
      return null;
    }

    return this.toRole(row);
  }

  async findAll(): Promise<Role[]> {
    const rows = await this.sql<RoleRow[]>`
      SELECT * FROM roles ORDER BY is_system DESC, name ASC
    `;

    return rows.map((row) => this.toRole(row));
  }

  async findByIds(ids: string[]): Promise<Role[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.sql<RoleRow[]>`
      SELECT * FROM roles WHERE id = ANY(${ids})
    `;

    return rows.map((row) => this.toRole(row));
  }

  async delete(id: string): Promise<void> {
    // Prevent deletion of system roles
    const [role] = await this.sql<{ is_system: boolean }[]>`
      SELECT is_system FROM roles WHERE id = ${id}
    `;

    if (role?.is_system) {
      throw new Error('Cannot delete system role');
    }

    await this.sql`
      DELETE FROM roles WHERE id = ${id}
    `;
  }

  private toRole(row: RoleRow): Role {
    // Parse permissions - handle both JSONB array and text array formats
    const permissions = this.parsePermissions(row.permissions);

    // Parse user types - handle both JSONB array and text array formats
    const userTypes = this.parseUserTypes(row.user_types);

    return Role.reconstruct({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      permissions,
      applicableUserTypes: userTypes,
      isSystem: row.is_system,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  private parsePermissions(permissions: string[] | string): Permission[] {
    // Handle case where postgres returns JSONB as string
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(permissions)) {
      return [];
    }

    return permissions.map((p) => {
      // Handle nested JSON strings (e.g., '"listings:read"')
      const value = p.startsWith('"') ? JSON.parse(p) : p;
      return new Permission(value);
    });
  }

  private parseUserTypes(userTypes: string[] | string): UserTypeValue[] {
    // Handle case where postgres returns JSONB as string
    if (typeof userTypes === 'string') {
      try {
        userTypes = JSON.parse(userTypes);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(userTypes)) {
      return [];
    }

    return userTypes.map((ut) => {
      // Handle nested JSON strings
      return (ut.startsWith('"') ? JSON.parse(ut) : ut) as UserTypeValue;
    });
  }
}
