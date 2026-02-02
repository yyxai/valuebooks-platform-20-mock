import { Role } from './Role.js';
import { Permission } from './value-objects/Permission.js';
import { UserType } from './UserType.js';

// System role IDs
export const SystemRoleIds = {
  BUYER: 'system-role-buyer',
  SELLER: 'system-role-seller',
  PARTNER: 'system-role-partner',
  APPRAISER: 'system-role-appraiser',
  WAREHOUSE_OPERATOR: 'system-role-warehouse-operator',
  CUSTOMER_SUPPORT: 'system-role-customer-support',
  ADMIN: 'system-role-admin',
} as const;

// Predefined system roles
export const SystemRoles = {
  // Consumer roles
  BUYER: Role.createSystem({
    id: SystemRoleIds.BUYER,
    name: 'Buyer',
    description: 'Can browse and purchase books',
    permissions: [
      new Permission('listings:read'),
      new Permission('orders:read'),
      new Permission('orders:write'),
    ],
    applicableUserTypes: [UserType.CONSUMER],
  }),

  SELLER: Role.createSystem({
    id: SystemRoleIds.SELLER,
    name: 'Seller',
    description: 'Can sell books to ValueBooks',
    permissions: [
      new Permission('listings:read'),
      new Permission('purchase_requests:read'),
      new Permission('purchase_requests:write'),
    ],
    applicableUserTypes: [UserType.CONSUMER],
  }),

  // Business partner role
  PARTNER: Role.createSystem({
    id: SystemRoleIds.PARTNER,
    name: 'Business Partner',
    description: 'Business partner with bulk operations',
    permissions: [
      new Permission('listings:read'),
      new Permission('orders:read'),
      new Permission('orders:write'),
      new Permission('purchase_requests:read'),
      new Permission('purchase_requests:write'),
      new Permission('reports:read'),
    ],
    applicableUserTypes: [UserType.BUSINESS_PARTNER],
  }),

  // Employee roles
  APPRAISER: Role.createSystem({
    id: SystemRoleIds.APPRAISER,
    name: 'Appraiser',
    description: 'Can appraise books',
    permissions: [
      new Permission('appraisals:read'),
      new Permission('appraisals:write'),
      new Permission('purchase_requests:read'),
      new Permission('listings:read'),
    ],
    applicableUserTypes: [UserType.EMPLOYEE],
  }),

  WAREHOUSE_OPERATOR: Role.createSystem({
    id: SystemRoleIds.WAREHOUSE_OPERATOR,
    name: 'Warehouse Operator',
    description: 'Manages warehouse operations',
    permissions: [
      new Permission('orders:read'),
      new Permission('fulfillment:read'),
      new Permission('fulfillment:write'),
      new Permission('listings:read'),
    ],
    applicableUserTypes: [UserType.EMPLOYEE],
  }),

  CUSTOMER_SUPPORT: Role.createSystem({
    id: SystemRoleIds.CUSTOMER_SUPPORT,
    name: 'Customer Support',
    description: 'Handles customer inquiries',
    permissions: [
      new Permission('users:read'),
      new Permission('orders:read'),
      new Permission('orders:cancel'),
      new Permission('purchase_requests:read'),
      new Permission('listings:read'),
    ],
    applicableUserTypes: [UserType.EMPLOYEE],
  }),

  ADMIN: Role.createSystem({
    id: SystemRoleIds.ADMIN,
    name: 'Administrator',
    description: 'Full system access',
    permissions: [
      new Permission('admin:*'),
      new Permission('users:read'),
      new Permission('users:write'),
      new Permission('users:delete'),
      new Permission('roles:read'),
      new Permission('roles:write'),
      new Permission('listings:*'),
      new Permission('orders:*'),
      new Permission('appraisals:*'),
      new Permission('fulfillment:*'),
      new Permission('purchase_requests:*'),
      new Permission('reports:*'),
    ],
    applicableUserTypes: [UserType.EMPLOYEE],
  }),
} as const;

export function getAllSystemRoles(): Role[] {
  return Object.values(SystemRoles);
}

export function getSystemRoleById(id: string): Role | undefined {
  return getAllSystemRoles().find((role) => role.id === id);
}
