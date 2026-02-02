import { describe, it, expect } from 'vitest';
import { Address } from './Address.js';

describe('Address', () => {
  const validProps = {
    name: 'John Doe',
    street1: '123 Main St',
    city: 'Tokyo',
    state: 'Tokyo',
    postalCode: '100-0001',
  };

  describe('create', () => {
    it('should create a valid address', () => {
      const address = Address.create(validProps);
      expect(address.name).toBe('John Doe');
      expect(address.street1).toBe('123 Main St');
      expect(address.city).toBe('Tokyo');
      expect(address.state).toBe('Tokyo');
      expect(address.postalCode).toBe('100-0001');
      expect(address.country).toBe('JP');
    });

    it('should trim whitespace', () => {
      const address = Address.create({
        ...validProps,
        name: '  John Doe  ',
      });
      expect(address.name).toBe('John Doe');
    });

    it('should include optional street2', () => {
      const address = Address.create({
        ...validProps,
        street2: 'Apt 101',
      });
      expect(address.street2).toBe('Apt 101');
    });

    it('should throw if name is missing', () => {
      expect(() => Address.create({ ...validProps, name: '' })).toThrow(
        'Name is required'
      );
    });

    it('should throw if street1 is missing', () => {
      expect(() => Address.create({ ...validProps, street1: '' })).toThrow(
        'Street address is required'
      );
    });

    it('should throw if city is missing', () => {
      expect(() => Address.create({ ...validProps, city: '' })).toThrow(
        'City is required'
      );
    });

    it('should throw if state is missing', () => {
      expect(() => Address.create({ ...validProps, state: '' })).toThrow(
        'State is required'
      );
    });

    it('should throw if postalCode is missing', () => {
      expect(() => Address.create({ ...validProps, postalCode: '' })).toThrow(
        'Postal code is required'
      );
    });
  });

  describe('equals', () => {
    it('should return true for equal addresses', () => {
      const a = Address.create(validProps);
      const b = Address.create(validProps);
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different addresses', () => {
      const a = Address.create(validProps);
      const b = Address.create({ ...validProps, name: 'Jane Doe' });
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const address = Address.create(validProps);
      expect(address.toJSON()).toEqual({
        name: 'John Doe',
        street1: '123 Main St',
        street2: undefined,
        city: 'Tokyo',
        state: 'Tokyo',
        postalCode: '100-0001',
        country: 'JP',
      });
    });
  });
});
