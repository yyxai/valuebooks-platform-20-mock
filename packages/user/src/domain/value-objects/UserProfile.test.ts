import { describe, it, expect } from 'vitest';
import { UserProfile } from './UserProfile.js';

describe('UserProfile', () => {
  describe('constructor', () => {
    it('should create a UserProfile with name only', () => {
      const profile = new UserProfile({ name: 'John Doe' });
      expect(profile.name).toBe('John Doe');
      expect(profile.phone).toBeUndefined();
    });

    it('should create a UserProfile with name and phone', () => {
      const profile = new UserProfile({ name: 'John Doe', phone: '+1-234-567-8900' });
      expect(profile.name).toBe('John Doe');
      expect(profile.phone).toBe('+1-234-567-8900');
    });

    it('should trim name', () => {
      const profile = new UserProfile({ name: '  John Doe  ' });
      expect(profile.name).toBe('John Doe');
    });

    it('should trim phone', () => {
      const profile = new UserProfile({ name: 'John', phone: '  123  ' });
      expect(profile.phone).toBe('123');
    });

    it('should throw for empty name', () => {
      expect(() => new UserProfile({ name: '' })).toThrow('Name cannot be empty');
    });

    it('should throw for whitespace-only name', () => {
      expect(() => new UserProfile({ name: '   ' })).toThrow('Name cannot be empty');
    });

    it('should throw for name exceeding 255 characters', () => {
      expect(() => new UserProfile({ name: 'a'.repeat(256) })).toThrow(
        'Name cannot exceed 255 characters'
      );
    });

    it('should throw for phone exceeding 50 characters', () => {
      expect(() => new UserProfile({ name: 'John', phone: '1'.repeat(51) })).toThrow(
        'Phone cannot exceed 50 characters'
      );
    });
  });

  describe('withName', () => {
    it('should return a new profile with updated name', () => {
      const profile = new UserProfile({ name: 'John Doe', phone: '123' });
      const updated = profile.withName('Jane Doe');
      expect(updated.name).toBe('Jane Doe');
      expect(updated.phone).toBe('123');
      expect(profile.name).toBe('John Doe'); // Original unchanged
    });
  });

  describe('withPhone', () => {
    it('should return a new profile with updated phone', () => {
      const profile = new UserProfile({ name: 'John Doe', phone: '123' });
      const updated = profile.withPhone('456');
      expect(updated.name).toBe('John Doe');
      expect(updated.phone).toBe('456');
      expect(profile.phone).toBe('123'); // Original unchanged
    });

    it('should allow clearing phone', () => {
      const profile = new UserProfile({ name: 'John Doe', phone: '123' });
      const updated = profile.withPhone(undefined);
      expect(updated.phone).toBeUndefined();
    });
  });

  describe('equals', () => {
    it('should return true for equal profiles', () => {
      const profile1 = new UserProfile({ name: 'John Doe', phone: '123' });
      const profile2 = new UserProfile({ name: 'John Doe', phone: '123' });
      expect(profile1.equals(profile2)).toBe(true);
    });

    it('should return false for different names', () => {
      const profile1 = new UserProfile({ name: 'John Doe' });
      const profile2 = new UserProfile({ name: 'Jane Doe' });
      expect(profile1.equals(profile2)).toBe(false);
    });

    it('should return false for different phones', () => {
      const profile1 = new UserProfile({ name: 'John Doe', phone: '123' });
      const profile2 = new UserProfile({ name: 'John Doe', phone: '456' });
      expect(profile1.equals(profile2)).toBe(false);
    });
  });
});
