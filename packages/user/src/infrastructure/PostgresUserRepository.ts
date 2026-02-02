import postgres from 'postgres';
import { User } from '../domain/User.js';
import { UserId } from '../domain/value-objects/UserId.js';
import { Email } from '../domain/value-objects/Email.js';
import { HashedPassword } from '../domain/value-objects/HashedPassword.js';
import { UserProfile } from '../domain/value-objects/UserProfile.js';
import { AuthProvider } from '../domain/value-objects/AuthProvider.js';
import { RoleAssignment } from '../domain/RoleAssignment.js';
import type { UserStatusValue } from '../domain/UserStatus.js';
import type { UserTypeValue } from '../domain/UserType.js';
import type { UserRepository } from './UserRepository.js';
import type { UserRow, UserRoleAssignmentRow } from './db/types.js';

// Work around TypeScript issue with postgres.js TransactionSql type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlTagFn = (template: TemplateStringsArray, ...values: any[]) => postgres.PendingQuery<postgres.Row[]>;

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly sql: postgres.Sql) {}

  async save(user: User): Promise<void> {
    // Using a transaction to ensure atomicity
    await this.sql.begin(async (sql) => {
      const txSql = sql as unknown as SqlTagFn;

      // Upsert user
      await txSql`
        INSERT INTO users (
          id, email, password_hash, password_salt, user_type, auth_provider,
          auth_provider_external_id, status, profile_name, profile_phone,
          employee_department, employee_title, partner_company_name,
          created_at, updated_at, last_login_at
        ) VALUES (
          ${user.id.value},
          ${user.email.value},
          ${user.password?.hash ?? null},
          ${user.password?.salt ?? null},
          ${user.userType},
          ${user.authProvider.type},
          ${user.authProvider.externalId ?? null},
          ${user.status},
          ${user.profile.name},
          ${user.profile.phone ?? null},
          ${user.employeeInfo?.department ?? null},
          ${user.employeeInfo?.title ?? null},
          ${user.partnerInfo?.companyName ?? null},
          ${user.createdAt},
          ${user.updatedAt},
          ${user.lastLoginAt ?? null}
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          password_salt = EXCLUDED.password_salt,
          auth_provider = EXCLUDED.auth_provider,
          auth_provider_external_id = EXCLUDED.auth_provider_external_id,
          status = EXCLUDED.status,
          profile_name = EXCLUDED.profile_name,
          profile_phone = EXCLUDED.profile_phone,
          employee_department = EXCLUDED.employee_department,
          employee_title = EXCLUDED.employee_title,
          partner_company_name = EXCLUDED.partner_company_name,
          updated_at = EXCLUDED.updated_at,
          last_login_at = EXCLUDED.last_login_at
      `;

      // Sync role assignments
      // Delete all existing assignments for this user
      await txSql`
        DELETE FROM user_role_assignments WHERE user_id = ${user.id.value}
      `;

      // Insert current assignments one by one
      for (const ra of user.roleAssignments) {
        await txSql`
          INSERT INTO user_role_assignments (
            id, user_id, role_id, assigned_at, assigned_by, expires_at, scope
          ) VALUES (
            ${ra.id},
            ${ra.userId},
            ${ra.roleId},
            ${ra.assignedAt},
            ${ra.assignedBy ?? null},
            ${ra.expiresAt ?? null},
            ${ra.scope ?? null}
          )
        `;
      }
    });
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.sql<UserRow[]>`
      SELECT * FROM users WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return null;
    }

    return this.toUser(rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase();
    const rows = await this.sql<UserRow[]>`
      SELECT * FROM users WHERE email = ${normalizedEmail}
    `;

    if (rows.length === 0) {
      return null;
    }

    return this.toUser(rows[0]);
  }

  async findByAuthProviderExternalId(
    provider: string,
    externalId: string
  ): Promise<User | null> {
    const rows = await this.sql<UserRow[]>`
      SELECT * FROM users
      WHERE auth_provider = ${provider}
        AND auth_provider_external_id = ${externalId}
    `;

    if (rows.length === 0) {
      return null;
    }

    return this.toUser(rows[0]);
  }

  async findAll(): Promise<User[]> {
    const rows = await this.sql<UserRow[]>`
      SELECT * FROM users ORDER BY created_at DESC
    `;

    return Promise.all(rows.map((row) => this.toUser(row)));
  }

  async delete(id: string): Promise<void> {
    await this.sql`
      DELETE FROM users WHERE id = ${id}
    `;
  }

  private async toUser(row: UserRow): Promise<User> {
    // Fetch role assignments for this user
    const assignmentRows = await this.sql<UserRoleAssignmentRow[]>`
      SELECT * FROM user_role_assignments WHERE user_id = ${row.id}
    `;

    const roleAssignments = assignmentRows.map((ra) =>
      RoleAssignment.reconstruct({
        id: ra.id,
        userId: ra.user_id,
        roleId: ra.role_id,
        assignedAt: ra.assigned_at,
        assignedBy: ra.assigned_by ?? undefined,
        expiresAt: ra.expires_at ?? undefined,
        scope: ra.scope ?? undefined,
      })
    );

    return User.reconstruct({
      id: new UserId(row.id),
      email: new Email(row.email),
      password:
        row.password_hash && row.password_salt
          ? new HashedPassword(row.password_hash, row.password_salt)
          : undefined,
      userType: row.user_type as UserTypeValue,
      authProvider: new AuthProvider(
        row.auth_provider as 'email' | 'google' | 'apple' | 'amazon' | 'facebook',
        row.auth_provider_external_id ?? undefined
      ),
      status: row.status as UserStatusValue,
      profile: new UserProfile({
        name: row.profile_name,
        phone: row.profile_phone ?? undefined,
      }),
      employeeInfo:
        row.employee_department || row.employee_title
          ? {
              department: row.employee_department ?? undefined,
              title: row.employee_title ?? undefined,
            }
          : undefined,
      partnerInfo: row.partner_company_name
        ? { companyName: row.partner_company_name }
        : undefined,
      roleAssignments,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at ?? undefined,
    });
  }
}
