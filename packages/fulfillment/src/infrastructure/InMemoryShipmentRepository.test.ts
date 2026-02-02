import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryShipmentRepository } from './InMemoryShipmentRepository.js';
import { Shipment } from '../domain/Shipment.js';
import { ShipmentStatus } from '../domain/ShipmentStatus.js';
import { Address } from '../domain/Address.js';

describe('InMemoryShipmentRepository', () => {
  let repository: InMemoryShipmentRepository;
  const validAddress = Address.create({
    name: 'John Doe',
    street1: '123 Main St',
    city: 'Tokyo',
    state: 'Tokyo',
    postalCode: '100-0001',
  });

  beforeEach(() => {
    repository = new InMemoryShipmentRepository();
  });

  describe('save and findById', () => {
    it('should save and retrieve a shipment', async () => {
      const shipment = Shipment.create({
        orderId: 'order-123',
        shippingAddress: validAddress,
      });

      await repository.save(shipment);
      const found = await repository.findById(shipment.id);

      expect(found).toBe(shipment);
    });

    it('should return null for non-existent shipment', async () => {
      const found = await repository.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByOrderId', () => {
    it('should find shipment by order ID', async () => {
      const shipment = Shipment.create({
        orderId: 'order-123',
        shippingAddress: validAddress,
      });

      await repository.save(shipment);
      const found = await repository.findByOrderId('order-123');

      expect(found).toBe(shipment);
    });

    it('should return null for non-existent order ID', async () => {
      const found = await repository.findByOrderId('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByStatus', () => {
    it('should find shipments by status', async () => {
      const pending = Shipment.create({
        orderId: 'order-1',
        shippingAddress: validAddress,
      });
      const picking = Shipment.create({
        orderId: 'order-2',
        shippingAddress: validAddress,
      }).startPicking();

      await repository.save(pending);
      await repository.save(picking);

      const pendingShipments = await repository.findByStatus(
        ShipmentStatus.Pending
      );
      const pickingShipments = await repository.findByStatus(
        ShipmentStatus.Picking
      );

      expect(pendingShipments).toHaveLength(1);
      expect(pendingShipments[0].orderId).toBe('order-1');
      expect(pickingShipments).toHaveLength(1);
      expect(pickingShipments[0].orderId).toBe('order-2');
    });
  });

  describe('findAll', () => {
    it('should return all shipments', async () => {
      const shipment1 = Shipment.create({
        orderId: 'order-1',
        shippingAddress: validAddress,
      });
      const shipment2 = Shipment.create({
        orderId: 'order-2',
        shippingAddress: validAddress,
      });

      await repository.save(shipment1);
      await repository.save(shipment2);

      const all = await repository.findAll();
      expect(all).toHaveLength(2);
    });
  });
});
