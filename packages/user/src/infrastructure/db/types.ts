// Database row types that map to PostgreSQL tables
// These are distinct from domain entities to maintain separation

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  password_salt: string | null;
  user_type: string;
  auth_provider: string;
  auth_provider_external_id: string | null;
  status: string;
  profile_name: string;
  profile_phone: string | null;
  employee_department: string | null;
  employee_title: string | null;
  partner_company_name: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  user_types: string[];
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserRoleAssignmentRow {
  id: string;
  user_id: string;
  role_id: string;
  assigned_at: Date;
  assigned_by: string | null;
  expires_at: Date | null;
  scope: string | null;
}

export interface RefreshTokenRow {
  jti: string;
  user_id: string;
  issued_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  device_info: Record<string, unknown> | null;
}
