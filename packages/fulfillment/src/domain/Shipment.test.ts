import { describe, it, expect, beforeEach } from 'vitest';
import { Shipment } from './Shipment.js';
import { ShipmentStatus } from './ShipmentStatus.js';
import { Carrier } from './Carrier.js';
import { Address } from './Address.js';

describe('Shipment', () => {
  const validAddress = Address.create({
    name: 'John Doe',
    street1: '123 Main St',
    city: 'Tokyo',
    state: 'Tokyo',
    postalCode: '100-0001',
  });

  describe('create', () => {
    it('should create a shipment in Pending status', () => {
      const shipment = Shipment.create({
        orderId: 'order-123',
        shippingAddress: validAddress,
      });

      expect(shipment.id).toBeDefined();
      expect(shipment.orderId).toBe('order-123');
      expect(shipment.shippingAddress).toBe(validAddress);
      expect(shipment.status).toBe(ShipmentStatus.Pending);
      expect(shipment.carrier).toBeUndefined();
      expect(shipment.trackingNumber).toBeUndefined();
      expect(shipment.createdAt).toBeInstanceOf(Date);
      expect(shipment.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct a shipment from stored data', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');

      const shipment = Shipment.reconstruct({
        id: 'shipment-456',
        orderId: 'order-123',
        shippingAddress: validAddress,
        status: ShipmentStatus.Dispatched,
        carrier: Carrier.Yamato,
        trackingNumber: '1234567890',
        createdAt,
        updatedAt,
      });

      expect(shipment.id).toBe('shipment-456');
      expect(shipment.status).toBe(ShipmentStatus.Dispatched);
      expect(shipment.carrier).toBe(Carrier.Yamato);
      expect(shipment.trackingNumber).toBe('1234567890');
      expect(shipment.createdAt).toBe(createdAt);
      expect(shipment.updatedAt).toBe(updatedAt);
    });
  });

  describe('trackingUrl', () => {
    it('should return undefined when no carrier/tracking', () => {
      const shipment = Shipment.create({
        orderId: 'order-123',
        shippingAddress: validAddress,
      });
      expect(shipment.trackingUrl).toBeUndefined();
    });

    it('should generate tracking URL when dispatched', () => {
      const shipment = Shipment.reconstruct({
        id: 'shipment-456',
        orderId: 'order-123',
        shippingAddress: validAddress,
        status: ShipmentStatus.Dispatched,
        carrier: Carrier.Yamato,
        trackingNumber: '1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(shipment.trackingUrl).toBe(
        'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=1234567890'
      );
    });
  });

  describe('state transitions', () => {
    let shipment: Shipment;

    beforeEach(() => {
      shipment = Shipment.create({
        orderId: 'order-123',
        shippingAddress: validAddress,
      });
    });

    it('should transition Pending -> Picking', () => {
      const updated = shipment.startPicking();
      expect(updated.status).toBe(ShipmentStatus.Picking);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        shipment.updatedAt.getTime() - 1
      );
    });

    it('should throw if startPicking from non-Pending', () => {
      const picking = shipment.startPicking();
      expect(() => picking.startPicking()).toThrow(
        'Can only start picking from Pending status'
      );
    });

    it('should transition Picking -> Packed', () => {
      const picking = shipment.startPicking();
      const packed = picking.markPacked();
      expect(packed.status).toBe(ShipmentStatus.Packed);
    });

    it('should throw if markPacked from non-Picking', () => {
      expect(() => shipment.markPacked()).toThrow(
        'Can only mark packed from Picking status'
      );
    });

    it('should transition Packed -> Dispatched', () => {
      const packed = shipment.startPicking().markPacked();
      const dispatched = packed.dispatch(Carrier.Sagawa, '9876543210');

      expect(dispatched.status).toBe(ShipmentStatus.Dispatched);
      expect(dispatched.carrier).toBe(Carrier.Sagawa);
      expect(dispatched.trackingNumber).toBe('9876543210');
    });

    it('should throw if dispatch from non-Packed', () => {
      expect(() => shipment.dispatch(Carrier.Yamato, '123')).toThrow(
        'Can only dispatch from Packed status'
      );
    });

    it('should throw if dispatch without tracking number', () => {
      const packed = shipment.startPicking().markPacked();
      expect(() => packed.dispatch(Carrier.Yamato, '')).toThrow(
        'Tracking number is required'
      );
    });

    it('should transition Dispatched -> InTransit', () => {
      const dispatched = shipment
        .startPicking()
        .markPacked()
        .dispatch(Carrier.Yamato, '123');
      const inTransit = dispatched.updateInTransit();
      expect(inTransit.status).toBe(ShipmentStatus.InTransit);
    });

    it('should throw if updateInTransit from non-Dispatched', () => {
      expect(() => shipment.updateInTransit()).toThrow(
        'Can only update to in-transit from Dispatched status'
      );
    });

    it('should transition InTransit -> Delivered', () => {
      const inTransit = shipment
        .startPicking()
        .markPacked()
        .dispatch(Carrier.Yamato, '123')
        .updateInTransit();
      const delivered = inTransit.markDelivered();

      expect(delivered.status).toBe(ShipmentStatus.Delivered);
      expect(delivered.deliveredAt).toBeInstanceOf(Date);
    });

    it('should throw if markDelivered from non-InTransit', () => {
      expect(() => shipment.markDelivered()).toThrow(
        'Can only mark delivered from InTransit status'
      );
    });
  });
});
