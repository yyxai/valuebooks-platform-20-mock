import { describe, it, expect } from 'vitest';
import {
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
} from './password.js';

describe('password', () => {
  describe('validatePasswordStrength', () => {
    it('should pass for valid password', () => {
      const result = validatePasswordStrength('ValidPass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for short password', () => {
      const result = validatePasswordStrength('Short1A');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 8 characters'
      );
    });

    it('should fail for password without lowercase', () => {
      const result = validatePasswordStrength('UPPERCASE123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter'
      );
    });

    it('should fail for password without uppercase', () => {
      const result = validatePasswordStrength('lowercase123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter'
      );
    });

    it('should fail for password without number', () => {
      const result = validatePasswordStrength('NoNumbers');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one number'
      );
    });

    it('should return multiple errors for very weak password', () => {
      const result = validatePasswordStrength('abc');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const hashed = await hashPassword('ValidPass123');

      expect(hashed.hash).toBeDefined();
      expect(hashed.salt).toBeDefined();
      expect(hashed.hash.length).toBe(64); // 256 bits = 32 bytes = 64 hex chars
      expect(hashed.salt.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate different salts for same password', async () => {
      const hashed1 = await hashPassword('ValidPass123');
      const hashed2 = await hashPassword('ValidPass123');

      expect(hashed1.salt).not.toBe(hashed2.salt);
      expect(hashed1.hash).not.toBe(hashed2.hash);
    });

    it('should throw for invalid password', async () => {
      await expect(hashPassword('weak')).rejects.toThrow('Invalid password');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'ValidPass123';
      const hashed = await hashPassword(password);

      const result = await verifyPassword(password, hashed);

      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hashed = await hashPassword('ValidPass123');

      const result = await verifyPassword('WrongPass456', hashed);

      expect(result).toBe(false);
    });

    it('should reject password with wrong case', async () => {
      const hashed = await hashPassword('ValidPass123');

      const result = await verifyPassword('validpass123', hashed);

      expect(result).toBe(false);
    });
  });
});
