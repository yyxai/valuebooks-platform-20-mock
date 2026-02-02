import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { PostgresRoleRepository } from './PostgresRoleRepository.js';
import { Role } from '../domain/Role.js';
import { Permission } from '../domain/value-objects/Permission.js';
import { UserType } from '../domain/UserType.js';

// Skip tests if DATABASE_URL is not set
const DATABASE_URL = process.env.DATABASE_URL;
const describeFn = DATABASE_URL ? describe : describe.skip;

describeFn('PostgresRoleRepository', () => {
  let sql: postgres.Sql;
  let repository: PostgresRoleRepository;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL!, { max: 1 });
    repository = new PostgresRoleRepository(sql);

    // Ensure roles table exists
    await sql`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
        user_types JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_system BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    // Clean up non-system roles
    await sql`DELETE FROM roles WHERE is_system = FALSE`;
  });

  function createTestRole(overrides: Partial<Parameters<typeof Role.create>[0]> = {}): Role {
    return Role.create({
      name: 'Test Role',
      description: 'A test role',
      permissions: [new Permission('listings:read'), new Permission('orders:read')],
      applicableUserTypes: [UserType.CONSUMER],
      ...overrides,
    });
  }

  it('should save and retrieve a role by id', async () => {
    const role = createTestRole();
    await repository.save(role);

    const found = await repository.findById(role.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(role.id);
    expect(found!.name).toBe(role.name);
    expect(found!.description).toBe(role.description);
    expect(found!.permissions).toHaveLength(2);
    expect(found!.applicableUserTypes).toContain(UserType.CONSUMER);
    expect(found!.isSystem).toBe(false);
  });

  it('should find role by name', async () => {
    const role = createTestRole({
      name: 'Unique Role Name',
    });
    await repository.save(role);

    const found = await repository.findByName('Unique Role Name');

    expect(found).not.toBeNull();
    expect(found!.id).toBe(role.id);
  });

  it('should return null for non-existent role', async () => {
    const found = await repository.findById('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });

  it('should update existing role', async () => {
    const role = createTestRole();
    await repository.save(role);

    // Update role
    role.updateDescription('Updated description');
    role.addPermission(new Permission('users:read'));
    await repository.save(role);

    const found = await repository.findById(role.id);

    expect(found!.description).toBe('Updated description');
    expect(found!.permissions).toHaveLength(3);
  });

  it('should find all roles', async () => {
    const role1 = createTestRole({
      name: 'Role One',
    });
    const role2 = createTestRole({
      name: 'Role Two',
    });

    await repository.save(role1);
    await repository.save(role2);

    const roles = await repository.findAll();

    // At least these two (might have system roles)
    expect(roles.length).toBeGreaterThanOrEqual(2);
    expect(roles.some((r) => r.name === 'Role One')).toBe(true);
    expect(roles.some((r) => r.name === 'Role Two')).toBe(true);
  });

  it('should find roles by ids', async () => {
    const role1 = createTestRole({
      name: 'Role A',
    });
    const role2 = createTestRole({
      name: 'Role B',
    });
    const role3 = createTestRole({
      name: 'Role C',
    });

    await repository.save(role1);
    await repository.save(role2);
    await repository.save(role3);

    const found = await repository.findByIds([role1.id, role3.id]);

    expect(found).toHaveLength(2);
    expect(found.some((r) => r.id === role1.id)).toBe(true);
    expect(found.some((r) => r.id === role3.id)).toBe(true);
  });

  it('should return empty array for findByIds with empty array', async () => {
    const found = await repository.findByIds([]);
    expect(found).toHaveLength(0);
  });

  it('should delete non-system role', async () => {
    const role = createTestRole();
    await repository.save(role);

    await repository.delete(role.id);

    const found = await repository.findById(role.id);
    expect(found).toBeNull();
  });

  it('should throw when deleting system role', async () => {
    // Create a system role
    const systemRole = Role.createSystem({
      id: crypto.randomUUID(),
      name: 'Test System Role',
      description: 'A system role for testing',
      permissions: [new Permission('admin:*')],
      applicableUserTypes: [UserType.EMPLOYEE],
    });
    await repository.save(systemRole);

    await expect(repository.delete(systemRole.id)).rejects.toThrow(
      'Cannot delete system role'
    );

    // Clean up
    await sql`DELETE FROM roles WHERE id = ${systemRole.id}`;
  });

  it('should handle roles with multiple user types', async () => {
    const role = createTestRole({
      name: 'Multi Type Role',
      applicableUserTypes: [UserType.CONSUMER, UserType.EMPLOYEE],
    });
    await repository.save(role);

    const found = await repository.findById(role.id);

    expect(found!.applicableUserTypes).toHaveLength(2);
    expect(found!.applicableUserTypes).toContain(UserType.CONSUMER);
    expect(found!.applicableUserTypes).toContain(UserType.EMPLOYEE);
  });

  it('should handle roles with wildcard permissions', async () => {
    const role = createTestRole({
      name: 'Admin Role',
      permissions: [new Permission('listings:*'), new Permission('admin:*')],
    });
    await repository.save(role);

    const found = await repository.findById(role.id);

    expect(found!.permissions).toHaveLength(2);
    expect(found!.hasPermission(new Permission('listings:read'))).toBe(true);
    expect(found!.hasPermission(new Permission('listings:write'))).toBe(true);
  });

  it('should save role without description', async () => {
    const role = Role.create({
      name: 'No Description Role',
      permissions: [new Permission('listings:read')],
      applicableUserTypes: [UserType.CONSUMER],
    });
    await repository.save(role);

    const found = await repository.findById(role.id);

    expect(found!.description).toBeUndefined();
  });
});
