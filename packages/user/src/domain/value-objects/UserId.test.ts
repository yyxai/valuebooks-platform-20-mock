import { describe, it, expect } from 'vitest';
import { UserId } from './UserId.js';

describe('UserId', () => {
  describe('constructor', () => {
    it('should create a UserId with a valid UUID', () => {
      const id = new UserId('550e8400-e29b-41d4-a716-446655440000');
      expect(id.value).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should throw an error for an invalid UUID', () => {
      expect(() => new UserId('invalid')).toThrow('UserId must be a valid UUID');
    });

    it('should throw an error for an empty string', () => {
      expect(() => new UserId('')).toThrow('UserId must be a valid UUID');
    });
  });

  describe('generate', () => {
    it('should generate a valid UserId', () => {
      const id = UserId.generate();
      expect(id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique IDs', () => {
      const id1 = UserId.generate();
      const id2 = UserId.generate();
      expect(id1.value).not.toBe(id2.value);
    });
  });

  describe('equals', () => {
    it('should return true for equal IDs', () => {
      const id1 = new UserId('550e8400-e29b-41d4-a716-446655440000');
      const id2 = new UserId('550e8400-e29b-41d4-a716-446655440000');
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different IDs', () => {
      const id1 = new UserId('550e8400-e29b-41d4-a716-446655440000');
      const id2 = new UserId('660e8400-e29b-41d4-a716-446655440000');
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the UUID string', () => {
      const id = new UserId('550e8400-e29b-41d4-a716-446655440000');
      expect(id.toString()).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });
});
