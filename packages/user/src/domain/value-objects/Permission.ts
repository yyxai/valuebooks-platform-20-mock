// Permission format: "resource:action"
// Examples: "listings:read", "users:write", "orders:*"
const PERMISSION_REGEX = /^[a-z_]+:[a-z_*]+$/;

export class Permission {
  public readonly resource: string;
  public readonly action: string;

  constructor(public readonly value: string) {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      throw new Error('Permission cannot be empty');
    }
    if (!PERMISSION_REGEX.test(trimmed)) {
      throw new Error(
        'Permission must be in format "resource:action" (e.g., "listings:read")'
      );
    }

    const [resource, action] = trimmed.split(':');
    this.resource = resource;
    this.action = action;
    this.value = trimmed;
  }

  matches(other: Permission): boolean {
    if (this.resource !== other.resource && this.resource !== '*') {
      return false;
    }
    if (this.action !== other.action && this.action !== '*') {
      return false;
    }
    return true;
  }

  equals(other: Permission): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

// Common permission constants
export const Permissions = {
  // Listings
  LISTINGS_READ: new Permission('listings:read'),
  LISTINGS_WRITE: new Permission('listings:write'),
  LISTINGS_DELETE: new Permission('listings:delete'),

  // Users
  USERS_READ: new Permission('users:read'),
  USERS_WRITE: new Permission('users:write'),
  USERS_DELETE: new Permission('users:delete'),

  // Orders
  ORDERS_READ: new Permission('orders:read'),
  ORDERS_WRITE: new Permission('orders:write'),
  ORDERS_CANCEL: new Permission('orders:cancel'),

  // Appraisals
  APPRAISALS_READ: new Permission('appraisals:read'),
  APPRAISALS_WRITE: new Permission('appraisals:write'),

  // Roles
  ROLES_READ: new Permission('roles:read'),
  ROLES_WRITE: new Permission('roles:write'),

  // Admin
  ADMIN_ALL: new Permission('admin:*'),
} as const;
