import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@valuebooks/shared';
import { FulfillmentService } from './FulfillmentService.js';
import { InMemoryShipmentRepository } from '../infrastructure/InMemoryShipmentRepository.js';
import { ShipmentStatus } from '../domain/ShipmentStatus.js';
import { Carrier } from '../domain/Carrier.js';
import { Address } from '../domain/Address.js';
import { ShipmentEventTypes } from '../domain/events/index.js';

describe('FulfillmentService', () => {
  let service: FulfillmentService;
  let repository: InMemoryShipmentRepository;
  let eventBus: EventBus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let publishSpy: any;

  const validAddress = Address.create({
    name: 'John Doe',
    street1: '123 Main St',
    city: 'Tokyo',
    state: 'Tokyo',
    postalCode: '100-0001',
  });

  beforeEach(() => {
    repository = new InMemoryShipmentRepository();
    eventBus = new EventBus();
    publishSpy = vi.spyOn(eventBus, 'publish');
    service = new FulfillmentService(repository, eventBus);
  });

  describe('createShipment', () => {
    it('should create a shipment in Pending status', async () => {
      const shipment = await service.createShipment('order-123', validAddress);

      expect(shipment.orderId).toBe('order-123');
      expect(shipment.status).toBe(ShipmentStatus.Pending);
      expect(shipment.shippingAddress).toBe(validAddress);
    });

    it('should save shipment to repository', async () => {
      const shipment = await service.createShipment('order-123', validAddress);
      const found = await repository.findById(shipment.id);

      expect(found).toBe(shipment);
    });

    it('should publish ShipmentCreated event', async () => {
      const shipment = await service.createShipment('order-123', validAddress);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ShipmentEventTypes.CREATED,
          payload: expect.objectContaining({
            shipmentId: shipment.id,
            orderId: 'order-123',
          }),
        })
      );
    });
  });

  describe('startPicking', () => {
    it('should transition shipment to Picking', async () => {
      const created = await service.createShipment('order-123', validAddress);
      const picking = await service.startPicking(created.id);

      expect(picking.status).toBe(ShipmentStatus.Picking);
    });

    it('should publish ShipmentPicking event', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ShipmentEventTypes.PICKING,
        })
      );
    });

    it('should throw if shipment not found', async () => {
      await expect(service.startPicking('non-existent')).rejects.toThrow(
        'Shipment not found'
      );
    });
  });

  describe('markPacked', () => {
    it('should transition shipment to Packed', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      const packed = await service.markPacked(created.id);

      expect(packed.status).toBe(ShipmentStatus.Packed);
    });

    it('should publish ShipmentPacked event', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      await service.markPacked(created.id);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ShipmentEventTypes.PACKED,
        })
      );
    });
  });

  describe('dispatch', () => {
    it('should transition shipment to Dispatched with carrier info', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      await service.markPacked(created.id);
      const dispatched = await service.dispatch(
        created.id,
        Carrier.Yamato,
        '1234567890'
      );

      expect(dispatched.status).toBe(ShipmentStatus.Dispatched);
      expect(dispatched.carrier).toBe(Carrier.Yamato);
      expect(dispatched.trackingNumber).toBe('1234567890');
    });

    it('should publish ShipmentDispatched event with tracking URL', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      await service.markPacked(created.id);
      await service.dispatch(created.id, Carrier.Yamato, '1234567890');

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ShipmentEventTypes.DISPATCHED,
          payload: expect.objectContaining({
            carrier: Carrier.Yamato,
            trackingNumber: '1234567890',
            trackingUrl:
              'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=1234567890',
          }),
        })
      );
    });
  });

  describe('updateInTransit', () => {
    it('should transition shipment to InTransit', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      await service.markPacked(created.id);
      await service.dispatch(created.id, Carrier.Yamato, '123');
      const inTransit = await service.updateInTransit(created.id);

      expect(inTransit.status).toBe(ShipmentStatus.InTransit);
    });
  });

  describe('markDelivered', () => {
    it('should transition shipment to Delivered', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      await service.markPacked(created.id);
      await service.dispatch(created.id, Carrier.Yamato, '123');
      await service.updateInTransit(created.id);
      const delivered = await service.markDelivered(created.id);

      expect(delivered.status).toBe(ShipmentStatus.Delivered);
      expect(delivered.deliveredAt).toBeInstanceOf(Date);
    });

    it('should publish ShipmentDelivered event', async () => {
      const created = await service.createShipment('order-123', validAddress);
      await service.startPicking(created.id);
      await service.markPacked(created.id);
      await service.dispatch(created.id, Carrier.Yamato, '123');
      await service.updateInTransit(created.id);
      await service.markDelivered(created.id);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ShipmentEventTypes.DELIVERED,
          payload: expect.objectContaining({
            shipmentId: created.id,
            orderId: 'order-123',
          }),
        })
      );
    });
  });

  describe('queries', () => {
    it('should get shipment by order ID', async () => {
      const created = await service.createShipment('order-123', validAddress);
      const found = await service.getByOrderId('order-123');

      expect(found).toBe(created);
    });

    it('should get shipments by status', async () => {
      await service.createShipment('order-1', validAddress);
      const created2 = await service.createShipment('order-2', validAddress);
      await service.startPicking(created2.id);

      const pending = await service.getShipmentsByStatus(ShipmentStatus.Pending);
      const picking = await service.getShipmentsByStatus(ShipmentStatus.Picking);

      expect(pending).toHaveLength(1);
      expect(picking).toHaveLength(1);
    });

    it('should get all shipments', async () => {
      await service.createShipment('order-1', validAddress);
      await service.createShipment('order-2', validAddress);

      const all = await service.getAllShipments();
      expect(all).toHaveLength(2);
    });
  });
});
