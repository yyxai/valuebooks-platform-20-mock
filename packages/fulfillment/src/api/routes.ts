import { Hono } from 'hono';
import type { Shipment } from '../domain/Shipment.js';
import { Carrier } from '../domain/Carrier.js';
import type { ShipmentStatus } from '../domain/ShipmentStatus.js';
import type { FulfillmentService } from '../services/FulfillmentService.js';

export function createFulfillmentRoutes(service: FulfillmentService): Hono {
  const app = new Hono();

  // List shipments (optional status filter)
  app.get('/shipments', async (c) => {
    const status = c.req.query('status') as ShipmentStatus | undefined;
    const shipments = status
      ? await service.getShipmentsByStatus(status)
      : await service.getAllShipments();
    return c.json(shipments.map(formatShipment));
  });

  // Get shipment by ID
  app.get('/shipments/:id', async (c) => {
    const all = await service.getAllShipments();
    const found = all.find((s) => s.id === c.req.param('id'));
    if (!found) {
      return c.json({ error: 'Shipment not found' }, 404);
    }
    return c.json(formatShipment(found));
  });

  // Get shipment by order ID
  app.get('/shipments/order/:orderId', async (c) => {
    const shipment = await service.getByOrderId(c.req.param('orderId'));
    if (!shipment) {
      return c.json({ error: 'Shipment not found' }, 404);
    }
    return c.json(formatShipment(shipment));
  });

  // Start picking
  app.post('/shipments/:id/picking', async (c) => {
    try {
      const shipment = await service.startPicking(c.req.param('id'));
      return c.json(formatShipment(shipment));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  // Mark packed
  app.post('/shipments/:id/packed', async (c) => {
    try {
      const shipment = await service.markPacked(c.req.param('id'));
      return c.json(formatShipment(shipment));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  // Dispatch
  app.post('/shipments/:id/dispatch', async (c) => {
    try {
      const body = await c.req.json();
      const carrier = body.carrier as Carrier;
      const shipment = await service.dispatch(
        c.req.param('id'),
        carrier,
        body.trackingNumber
      );
      return c.json(formatShipment(shipment));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  // Update to in-transit
  app.post('/shipments/:id/in-transit', async (c) => {
    try {
      const shipment = await service.updateInTransit(c.req.param('id'));
      return c.json(formatShipment(shipment));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  // Mark delivered
  app.post('/shipments/:id/delivered', async (c) => {
    try {
      const shipment = await service.markDelivered(c.req.param('id'));
      return c.json(formatShipment(shipment));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  return app;
}

function formatShipment(shipment: Shipment) {
  return {
    id: shipment.id,
    orderId: shipment.orderId,
    status: shipment.status,
    shippingAddress: shipment.shippingAddress.toJSON(),
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    deliveredAt: shipment.deliveredAt,
    createdAt: shipment.createdAt,
    updatedAt: shipment.updatedAt,
  };
}
