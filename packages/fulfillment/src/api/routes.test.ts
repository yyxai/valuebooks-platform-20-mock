import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '@valuebooks/shared';
import { createFulfillmentRoutes } from './routes.js';
import { FulfillmentService } from '../services/FulfillmentService.js';
import { InMemoryShipmentRepository } from '../infrastructure/InMemoryShipmentRepository.js';
import { ShipmentStatus } from '../domain/ShipmentStatus.js';
import { Carrier } from '../domain/Carrier.js';
import { Address } from '../domain/Address.js';

describe('Fulfillment API Routes', () => {
  let app: ReturnType<typeof createFulfillmentRoutes>;
  let service: FulfillmentService;

  const validAddress = Address.create({
    name: 'John Doe',
    street1: '123 Main St',
    city: 'Tokyo',
    state: 'Tokyo',
    postalCode: '100-0001',
  });

  beforeEach(() => {
    const repository = new InMemoryShipmentRepository();
    const eventBus = new EventBus();
    service = new FulfillmentService(repository, eventBus);
    app = createFulfillmentRoutes(service);
  });

  describe('GET /shipments', () => {
    it('should return all shipments', async () => {
      await service.createShipment('order-1', validAddress);
      await service.createShipment('order-2', validAddress);

      const res = await app.request('/shipments');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const shipment = await service.createShipment('order-1', validAddress);
      await service.createShipment('order-2', validAddress);
      await service.startPicking(shipment.id);

      const res = await app.request('/shipments?status=picking');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].status).toBe('picking');
    });
  });

  describe('GET /shipments/:id', () => {
    it('should return shipment by ID', async () => {
      const shipment = await service.createShipment('order-123', validAddress);

      const res = await app.request(`/shipments/${shipment.id}`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.id).toBe(shipment.id);
      expect(body.orderId).toBe('order-123');
    });

    it('should return 404 for non-existent shipment', async () => {
      const res = await app.request('/shipments/non-existent');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /shipments/order/:orderId', () => {
    it('should return shipment by order ID', async () => {
      await service.createShipment('order-123', validAddress);

      const res = await app.request('/shipments/order/order-123');
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.orderId).toBe('order-123');
    });

    it('should return 404 for non-existent order', async () => {
      const res = await app.request('/shipments/order/non-existent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /shipments/:id/picking', () => {
    it('should start picking', async () => {
      const shipment = await service.createShipment('order-123', validAddress);

      const res = await app.request(`/shipments/${shipment.id}/picking`, {
        method: 'POST',
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('picking');
    });
  });

  describe('POST /shipments/:id/packed', () => {
    it('should mark as packed', async () => {
      const shipment = await service.createShipment('order-123', validAddress);
      await service.startPicking(shipment.id);

      const res = await app.request(`/shipments/${shipment.id}/packed`, {
        method: 'POST',
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('packed');
    });
  });

  describe('POST /shipments/:id/dispatch', () => {
    it('should dispatch with carrier and tracking', async () => {
      const shipment = await service.createShipment('order-123', validAddress);
      await service.startPicking(shipment.id);
      await service.markPacked(shipment.id);

      const res = await app.request(`/shipments/${shipment.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: 'yamato',
          trackingNumber: '1234567890',
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('dispatched');
      expect(body.carrier).toBe('yamato');
      expect(body.trackingNumber).toBe('1234567890');
      expect(body.trackingUrl).toBe(
        'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=1234567890'
      );
    });
  });

  describe('POST /shipments/:id/in-transit', () => {
    it('should update to in-transit', async () => {
      const shipment = await service.createShipment('order-123', validAddress);
      await service.startPicking(shipment.id);
      await service.markPacked(shipment.id);
      await service.dispatch(shipment.id, Carrier.Yamato, '123');

      const res = await app.request(`/shipments/${shipment.id}/in-transit`, {
        method: 'POST',
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('in_transit');
    });
  });

  describe('POST /shipments/:id/delivered', () => {
    it('should mark as delivered', async () => {
      const shipment = await service.createShipment('order-123', validAddress);
      await service.startPicking(shipment.id);
      await service.markPacked(shipment.id);
      await service.dispatch(shipment.id, Carrier.Yamato, '123');
      await service.updateInTransit(shipment.id);

      const res = await app.request(`/shipments/${shipment.id}/delivered`, {
        method: 'POST',
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe('delivered');
      expect(body.deliveredAt).toBeDefined();
    });
  });
});
