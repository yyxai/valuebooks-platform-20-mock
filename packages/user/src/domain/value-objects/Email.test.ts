import { describe, it, expect } from 'vitest';
import { Email } from './Email.js';

describe('Email', () => {
  describe('constructor', () => {
    it('should create an Email with a valid address', () => {
      const email = new Email('user@example.com');
      expect(email.value).toBe('user@example.com');
    });

    it('should normalize email to lowercase', () => {
      const email = new Email('USER@EXAMPLE.COM');
      expect(email.value).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      const email = new Email('  user@example.com  ');
      expect(email.value).toBe('user@example.com');
    });

    it('should throw for empty string', () => {
      expect(() => new Email('')).toThrow('Email cannot be empty');
    });

    it('should throw for whitespace only', () => {
      expect(() => new Email('   ')).toThrow('Email cannot be empty');
    });

    it('should throw for invalid format - no @', () => {
      expect(() => new Email('invalid')).toThrow('Invalid email format');
    });

    it('should throw for invalid format - no domain', () => {
      expect(() => new Email('user@')).toThrow('Invalid email format');
    });

    it('should throw for invalid format - no TLD', () => {
      expect(() => new Email('user@domain')).toThrow('Invalid email format');
    });
  });

  describe('getDomain', () => {
    it('should return the domain part', () => {
      const email = new Email('user@example.com');
      expect(email.getDomain()).toBe('example.com');
    });
  });

  describe('isEmployeeDomain', () => {
    it('should return true for valuebooks.co.jp domain', () => {
      const email = new Email('employee@valuebooks.co.jp');
      expect(email.isEmployeeDomain()).toBe(true);
    });

    it('should return true for valuebooks.com domain', () => {
      const email = new Email('employee@valuebooks.com');
      expect(email.isEmployeeDomain()).toBe(true);
    });

    it('should return false for non-employee domain', () => {
      const email = new Email('user@gmail.com');
      expect(email.isEmployeeDomain()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for equal emails', () => {
      const email1 = new Email('user@example.com');
      const email2 = new Email('user@example.com');
      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for different emails', () => {
      const email1 = new Email('user1@example.com');
      const email2 = new Email('user2@example.com');
      expect(email1.equals(email2)).toBe(false);
    });

    it('should handle case-insensitive comparison', () => {
      const email1 = new Email('user@example.com');
      const email2 = new Email('USER@EXAMPLE.COM');
      expect(email1.equals(email2)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return the email string', () => {
      const email = new Email('user@example.com');
      expect(email.toString()).toBe('user@example.com');
    });
  });
});
