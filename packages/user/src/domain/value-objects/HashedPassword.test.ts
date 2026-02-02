import { describe, it, expect } from 'vitest';
import { HashedPassword } from './HashedPassword.js';

describe('HashedPassword', () => {
  describe('constructor', () => {
    it('should create a HashedPassword with valid hash and salt', () => {
      const password = new HashedPassword('hash123', 'salt456');
      expect(password.hash).toBe('hash123');
      expect(password.salt).toBe('salt456');
    });

    it('should throw for empty hash', () => {
      expect(() => new HashedPassword('', 'salt')).toThrow(
        'Password hash cannot be empty'
      );
    });

    it('should throw for empty salt', () => {
      expect(() => new HashedPassword('hash', '')).toThrow(
        'Password salt cannot be empty'
      );
    });
  });

  describe('equals', () => {
    it('should return true for equal passwords', () => {
      const password1 = new HashedPassword('hash123', 'salt456');
      const password2 = new HashedPassword('hash123', 'salt456');
      expect(password1.equals(password2)).toBe(true);
    });

    it('should return false for different hashes', () => {
      const password1 = new HashedPassword('hash123', 'salt456');
      const password2 = new HashedPassword('hash789', 'salt456');
      expect(password1.equals(password2)).toBe(false);
    });

    it('should return false for different salts', () => {
      const password1 = new HashedPassword('hash123', 'salt456');
      const password2 = new HashedPassword('hash123', 'salt789');
      expect(password1.equals(password2)).toBe(false);
    });
  });
});
