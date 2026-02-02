import { describe, it, expect } from 'vitest';
import { Permission, Permissions } from './Permission.js';

describe('Permission', () => {
  describe('constructor', () => {
    it('should create a Permission with valid format', () => {
      const permission = new Permission('listings:read');
      expect(permission.value).toBe('listings:read');
      expect(permission.resource).toBe('listings');
      expect(permission.action).toBe('read');
    });

    it('should normalize to lowercase', () => {
      const permission = new Permission('LISTINGS:READ');
      expect(permission.value).toBe('listings:read');
    });

    it('should trim whitespace', () => {
      const permission = new Permission('  listings:read  ');
      expect(permission.value).toBe('listings:read');
    });

    it('should allow wildcard action', () => {
      const permission = new Permission('admin:*');
      expect(permission.resource).toBe('admin');
      expect(permission.action).toBe('*');
    });

    it('should allow underscores', () => {
      const permission = new Permission('purchase_requests:create');
      expect(permission.resource).toBe('purchase_requests');
      expect(permission.action).toBe('create');
    });

    it('should throw for empty string', () => {
      expect(() => new Permission('')).toThrow('Permission cannot be empty');
    });

    it('should throw for invalid format - no colon', () => {
      expect(() => new Permission('invalid')).toThrow(
        'Permission must be in format "resource:action"'
      );
    });

    it('should throw for invalid format - multiple colons', () => {
      expect(() => new Permission('a:b:c')).toThrow(
        'Permission must be in format "resource:action"'
      );
    });

    it('should throw for invalid characters', () => {
      expect(() => new Permission('listings-read:write')).toThrow(
        'Permission must be in format "resource:action"'
      );
    });
  });

  describe('matches', () => {
    it('should match exact permissions', () => {
      const permission = new Permission('listings:read');
      const other = new Permission('listings:read');
      expect(permission.matches(other)).toBe(true);
    });

    it('should not match different resources', () => {
      const permission = new Permission('listings:read');
      const other = new Permission('orders:read');
      expect(permission.matches(other)).toBe(false);
    });

    it('should not match different actions', () => {
      const permission = new Permission('listings:read');
      const other = new Permission('listings:write');
      expect(permission.matches(other)).toBe(false);
    });

    it('should match wildcard action', () => {
      const permission = new Permission('listings:*');
      const other = new Permission('listings:read');
      expect(permission.matches(other)).toBe(true);
    });

    it('should match wildcard action for any action', () => {
      const permission = new Permission('admin:*');
      expect(permission.matches(new Permission('admin:read'))).toBe(true);
      expect(permission.matches(new Permission('admin:write'))).toBe(true);
      expect(permission.matches(new Permission('admin:delete'))).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for equal permissions', () => {
      const permission1 = new Permission('listings:read');
      const permission2 = new Permission('listings:read');
      expect(permission1.equals(permission2)).toBe(true);
    });

    it('should return false for different permissions', () => {
      const permission1 = new Permission('listings:read');
      const permission2 = new Permission('listings:write');
      expect(permission1.equals(permission2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the permission string', () => {
      const permission = new Permission('listings:read');
      expect(permission.toString()).toBe('listings:read');
    });
  });

  describe('Permissions constants', () => {
    it('should have common permissions defined', () => {
      expect(Permissions.LISTINGS_READ.value).toBe('listings:read');
      expect(Permissions.USERS_WRITE.value).toBe('users:write');
      expect(Permissions.ADMIN_ALL.value).toBe('admin:*');
    });
  });
});
