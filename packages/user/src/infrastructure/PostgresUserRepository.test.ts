import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { PostgresUserRepository } from './PostgresUserRepository.js';
import { User } from '../domain/User.js';
import { Email } from '../domain/value-objects/Email.js';
import { HashedPassword } from '../domain/value-objects/HashedPassword.js';
import { UserProfile } from '../domain/value-objects/UserProfile.js';
import { AuthProvider } from '../domain/value-objects/AuthProvider.js';
import { UserType } from '../domain/UserType.js';
import { UserStatus } from '../domain/UserStatus.js';
import { RoleAssignment } from '../domain/RoleAssignment.js';

// Skip tests if DATABASE_URL is not set (for CI environments without DB)
const DATABASE_URL = process.env.DATABASE_URL;
const describeFn = DATABASE_URL ? describe : describe.skip;

describeFn('PostgresUserRepository', () => {
  let sql: postgres.Sql;
  let repository: PostgresUserRepository;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL!, { max: 1 });
    repository = new PostgresUserRepository(sql);

    // Ensure tables exist
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        password_salt VARCHAR(255),
        user_type VARCHAR(50) NOT NULL,
        auth_provider VARCHAR(50) NOT NULL DEFAULT 'email',
        auth_provider_external_id VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'pending_verification',
        profile_name VARCHAR(255) NOT NULL,
        profile_phone VARCHAR(50),
        employee_department VARCHAR(100),
        employee_title VARCHAR(100),
        partner_company_name VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_role_assignments (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        assigned_by UUID,
        expires_at TIMESTAMPTZ,
        scope VARCHAR(255)
      )
    `;
  });

  afterAll(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    // Clean up before each test
    await sql`DELETE FROM user_role_assignments`;
    await sql`DELETE FROM users`;
  });

  function createTestUser(overrides: Partial<Parameters<typeof User.create>[0]> = {}): User {
    return User.create({
      email: new Email('test@example.com'),
      password: new HashedPassword('hash123', 'salt123'),
      userType: UserType.CONSUMER,
      authProvider: AuthProvider.email(),
      profile: new UserProfile({ name: 'Test User', phone: '123-456-7890' }),
      ...overrides,
    });
  }

  it('should save and retrieve a user by id', async () => {
    const user = createTestUser();
    await repository.save(user);

    const found = await repository.findById(user.id.value);

    expect(found).not.toBeNull();
    expect(found!.id.value).toBe(user.id.value);
    expect(found!.email.value).toBe(user.email.value);
    expect(found!.userType).toBe(user.userType);
    expect(found!.profile.name).toBe(user.profile.name);
    expect(found!.profile.phone).toBe(user.profile.phone);
  });

  it('should find user by email', async () => {
    const user = createTestUser({
      email: new Email('unique@example.com'),
    });
    await repository.save(user);

    const found = await repository.findByEmail('unique@example.com');

    expect(found).not.toBeNull();
    expect(found!.id.value).toBe(user.id.value);
  });

  it('should find user by email case-insensitively', async () => {
    const user = createTestUser({
      email: new Email('CamelCase@Example.COM'),
    });
    await repository.save(user);

    const found = await repository.findByEmail('camelcase@example.com');

    expect(found).not.toBeNull();
    expect(found!.id.value).toBe(user.id.value);
  });

  it('should return null for non-existent user', async () => {
    const found = await repository.findById('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });

  it('should find user by OAuth provider external id', async () => {
    const user = User.create({
      email: new Email('oauth@example.com'),
      userType: UserType.CONSUMER,
      authProvider: AuthProvider.google('google-123'),
      profile: new UserProfile({ name: 'OAuth User' }),
    });
    await repository.save(user);

    const found = await repository.findByAuthProviderExternalId('google', 'google-123');

    expect(found).not.toBeNull();
    expect(found!.id.value).toBe(user.id.value);
    expect(found!.authProvider.type).toBe('google');
    expect(found!.authProvider.externalId).toBe('google-123');
  });

  it('should update existing user', async () => {
    const user = createTestUser();
    await repository.save(user);

    // Update user
    user.verify();
    user.updateProfile(new UserProfile({ name: 'Updated Name', phone: '999-999-9999' }));
    await repository.save(user);

    const found = await repository.findById(user.id.value);

    expect(found!.status).toBe(UserStatus.ACTIVE);
    expect(found!.profile.name).toBe('Updated Name');
    expect(found!.profile.phone).toBe('999-999-9999');
  });

  it('should delete user', async () => {
    const user = createTestUser();
    await repository.save(user);

    await repository.delete(user.id.value);

    const found = await repository.findById(user.id.value);
    expect(found).toBeNull();
  });

  it('should find all users', async () => {
    const user1 = createTestUser({
      email: new Email('user1@example.com'),
    });
    const user2 = createTestUser({
      email: new Email('user2@example.com'),
    });

    await repository.save(user1);
    await repository.save(user2);

    const users = await repository.findAll();

    expect(users).toHaveLength(2);
  });

  it('should save and retrieve user with role assignments', async () => {
    const user = createTestUser();
    const assignment = RoleAssignment.create({
      userId: user.id.value,
      roleId: 'system-role-buyer', // Use existing system role
      assignedBy: undefined,
      expiresAt: undefined,
    });
    user.assignRole(assignment);

    await repository.save(user);

    const found = await repository.findById(user.id.value);

    expect(found!.roleAssignments).toHaveLength(1);
    expect(found!.roleAssignments[0].roleId).toBe('system-role-buyer');
  });

  it('should save employee-specific info', async () => {
    const user = User.create({
      email: new Email('employee@valuebooks.co.jp'),
      password: new HashedPassword('hash', 'salt'),
      userType: UserType.EMPLOYEE,
      authProvider: AuthProvider.email(),
      profile: new UserProfile({ name: 'Employee' }),
      employeeInfo: {
        department: 'Engineering',
        title: 'Senior Developer',
      },
    });

    await repository.save(user);

    const found = await repository.findById(user.id.value);

    expect(found!.employeeInfo).toBeDefined();
    expect(found!.employeeInfo!.department).toBe('Engineering');
    expect(found!.employeeInfo!.title).toBe('Senior Developer');
  });

  it('should save partner-specific info', async () => {
    const user = User.create({
      email: new Email('partner@example.com'),
      password: new HashedPassword('hash', 'salt'),
      userType: UserType.BUSINESS_PARTNER,
      authProvider: AuthProvider.email(),
      profile: new UserProfile({ name: 'Partner User' }),
      partnerInfo: {
        companyName: 'Partner Corp',
      },
    });

    await repository.save(user);

    const found = await repository.findById(user.id.value);

    expect(found!.partnerInfo).toBeDefined();
    expect(found!.partnerInfo!.companyName).toBe('Partner Corp');
  });

  it('should handle users without password (OAuth users)', async () => {
    const user = User.create({
      email: new Email('oauth@example.com'),
      userType: UserType.CONSUMER,
      authProvider: AuthProvider.google('google-external-id'),
      profile: new UserProfile({ name: 'OAuth User' }),
    });

    await repository.save(user);

    const found = await repository.findById(user.id.value);

    expect(found!.password).toBeUndefined();
    expect(found!.authProvider.type).toBe('google');
  });
});
