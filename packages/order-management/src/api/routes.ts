import { Hono } from 'hono';
import { Address } from '../domain/Address.js';
import type { PaymentMethod } from '../domain/Payment.js';
import type { Order } from '../domain/Order.js';
import type { OrderService } from '../services/OrderService.js';

export function createOrderRoutes(service: OrderService): Hono {
  const app = new Hono();

  // Create order
  app.post('/', async (c) => {
    try {
      const body = await c.req.json();
      const shippingAddress = Address.create(body.shippingAddress);
      const order = await service.create(body.customerId, shippingAddress);
      return c.json(formatOrder(order), 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: message }, 400);
    }
  });

  // Get order by ID
  app.get('/:id', async (c) => {
    const order = await service.getById(c.req.param('id'));
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }
    return c.json(formatOrder(order));
  });

  // Get orders by customer ID
  app.get('/customer/:customerId', async (c) => {
    const orders = await service.getByCustomerId(c.req.param('customerId'));
    return c.json({ orders: orders.map(formatOrder) });
  });

  // Add line item
  app.post('/:id/items', async (c) => {
    try {
      const body = await c.req.json();
      const order = await service.addLineItem(c.req.param('id'), body.listingId);
      return c.json(formatOrder(order));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Order not found' || message === 'Listing not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Remove line item
  app.delete('/:id/items/:listingId', async (c) => {
    try {
      const order = await service.removeLineItem(
        c.req.param('id'),
        c.req.param('listingId')
      );
      return c.json(formatOrder(order));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Order not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Start checkout
  app.post('/:id/checkout', async (c) => {
    try {
      const order = await service.checkout(c.req.param('id'));
      return c.json(formatOrder(order));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Order not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Process payment
  app.post('/:id/payment', async (c) => {
    try {
      const body = await c.req.json();
      const order = await service.processPayment(c.req.param('id'), {
        method: body.method as PaymentMethod,
        transactionId: body.transactionId,
      });
      return c.json(formatOrder(order));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Order not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Mark as shipped
  app.post('/:id/ship', async (c) => {
    try {
      const body = await c.req.json();
      const order = await service.markShipped(c.req.param('id'), {
        carrier: body.carrier,
        trackingNumber: body.trackingNumber,
      });
      return c.json(formatOrder(order));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Order not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Mark as delivered
  app.post('/:id/delivered', async (c) => {
    try {
      const order = await service.markDelivered(c.req.param('id'));
      return c.json(formatOrder(order));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Order not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  // Cancel order
  app.post('/:id/cancel', async (c) => {
    try {
      let reason: string | undefined;
      try {
        const body = await c.req.json();
        reason = body.reason;
      } catch {
        // No body provided
      }
      const order = await service.cancel(c.req.param('id'), reason);
      return c.json(formatOrder(order));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message === 'Order not found') {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 400);
    }
  });

  return app;
}

function formatOrder(order: Order) {
  return {
    id: order.id,
    customerId: order.customerId,
    status: order.status,
    shippingAddress: order.shippingAddress.toJSON(),
    billingAddress: order.billingAddress?.toJSON(),
    lineItems: order.lineItems.map(item => ({
      listingId: item.listingId,
      isbn: item.isbn,
      title: item.title,
      author: item.author,
      condition: item.condition,
      price: item.price.toDollars(),
      status: item.status,
    })),
    subtotal: order.subtotal.toDollars(),
    tax: order.tax.toDollars(),
    shipping: order.shipping.toDollars(),
    total: order.total.toDollars(),
    payment: order.payment
      ? {
          method: order.payment.method,
          amount: order.payment.amount.toDollars(),
          transactionId: order.payment.transactionId,
          processedAt: order.payment.processedAt,
          status: order.payment.status,
        }
      : undefined,
    shipmentTracking: order.shipmentTracking
      ? {
          carrier: order.shipmentTracking.carrier,
          trackingNumber: order.shipmentTracking.trackingNumber,
          shippedAt: order.shipmentTracking.shippedAt,
          deliveredAt: order.shipmentTracking.deliveredAt,
        }
      : undefined,
    cancelledAt: order.cancelledAt,
    cancelReason: order.cancelReason,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
