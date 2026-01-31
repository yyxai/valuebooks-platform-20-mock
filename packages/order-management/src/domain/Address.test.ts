import { describe, it, expect } from 'vitest';
import { Address } from './Address.js';

describe('Address', () => {
  const validAddressProps = {
    name: 'John Doe',
    street1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
  };

  describe('create', () => {
    it('creates an address with required fields', () => {
      const address = Address.create(validAddressProps);

      expect(address.name).toBe('John Doe');
      expect(address.street1).toBe('123 Main St');
      expect(address.street2).toBeUndefined();
      expect(address.city).toBe('San Francisco');
      expect(address.state).toBe('CA');
      expect(address.postalCode).toBe('94102');
      expect(address.country).toBe('US');
    });

    it('creates an address with optional fields', () => {
      const address = Address.create({
        ...validAddressProps,
        street2: 'Apt 4B',
        country: 'CA',
      });

      expect(address.street2).toBe('Apt 4B');
      expect(address.country).toBe('CA');
    });

    it('throws error when name is empty', () => {
      expect(() =>
        Address.create({ ...validAddressProps, name: '' })
      ).toThrow('Name is required');
    });

    it('throws error when street1 is empty', () => {
      expect(() =>
        Address.create({ ...validAddressProps, street1: '' })
      ).toThrow('Street address is required');
    });

    it('throws error when city is empty', () => {
      expect(() =>
        Address.create({ ...validAddressProps, city: '' })
      ).toThrow('City is required');
    });

    it('throws error when state is empty', () => {
      expect(() =>
        Address.create({ ...validAddressProps, state: '' })
      ).toThrow('State is required');
    });

    it('throws error when postal code is empty', () => {
      expect(() =>
        Address.create({ ...validAddressProps, postalCode: '' })
      ).toThrow('Postal code is required');
    });
  });

  describe('equals', () => {
    it('returns true for identical addresses', () => {
      const address1 = Address.create(validAddressProps);
      const address2 = Address.create(validAddressProps);

      expect(address1.equals(address2)).toBe(true);
    });

    it('returns false for different addresses', () => {
      const address1 = Address.create(validAddressProps);
      const address2 = Address.create({
        ...validAddressProps,
        street1: '456 Oak Ave',
      });

      expect(address1.equals(address2)).toBe(false);
    });

    it('considers country in equality check', () => {
      const address1 = Address.create(validAddressProps);
      const address2 = Address.create({ ...validAddressProps, country: 'CA' });

      expect(address1.equals(address2)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('serializes address to plain object', () => {
      const address = Address.create({
        ...validAddressProps,
        street2: 'Apt 4B',
      });

      expect(address.toJSON()).toEqual({
        name: 'John Doe',
        street1: '123 Main St',
        street2: 'Apt 4B',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        country: 'US',
      });
    });
  });
});
