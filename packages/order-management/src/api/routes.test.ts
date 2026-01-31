import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createOrderRoutes } from './routes.js';
import { OrderService } from '../services/OrderService.js';
import { InMemoryOrderRepository } from '../infrastructure/InMemoryOrderRepository.js';
import { InMemoryListingClient, type ListingData } from '../infrastructure/ListingClient.js';
import { EventBus } from '@valuebooks/shared';

describe('Order Routes', () => {
  let app: Hono;
  let service: OrderService;
  let listingClient: InMemoryListingClient;

  const testListing: ListingData = {
    id: 'listing-1',
    isbn: '978-0-13-468599-1',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    condition: 'good',
    listingPrice: 1999,
    status: 'available',
  };

  const shippingAddressData = {
    name: 'John Doe',
    street1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
  };

  beforeEach(() => {
    const repository = new InMemoryOrderRepository();
    listingClient = new InMemoryListingClient();
    const eventBus = new EventBus();
    service = new OrderService(repository, listingClient, eventBus);

    listingClient.addListing(testListing);

    app = new Hono();
    app.route('/orders', createOrderRoutes(service));
  });

  describe('POST /orders', () => {
    it('creates a new order', async () => {
      const response = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer-123',
          shippingAddress: shippingAddressData,
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBeDefined();
      expect(body.customerId).toBe('customer-123');
      expect(body.status).toBe('draft');
    });

    it('returns 400 for invalid input', async () => {
      const response = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: '',
          shippingAddress: shippingAddressData,
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /orders/:id', () => {
    it('returns order by ID', async () => {
      // Create order first
      const createRes = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer-123',
          shippingAddress: shippingAddressData,
        }),
      });
      const created = await createRes.json();

      const response = await app.request(`/orders/${created.id}`);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(created.id);
    });

    it('returns 404 for non-existent order', async () => {
      const response = await app.request('/orders/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /orders/customer/:customerId', () => {
    it('returns orders for customer', async () => {
      // Create two orders
      await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer-123',
          shippingAddress: shippingAddressData,
        }),
      });
      await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer-123',
          shippingAddress: shippingAddressData,
        }),
      });

      const response = await app.request('/orders/customer/customer-123');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.orders).toHaveLength(2);
    });
  });

  describe('POST /orders/:id/items', () => {
    it('adds a line item to the order', async () => {
      // Create order
      const createRes = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer-123',
          shippingAddress: shippingAddressData,
        }),
      });
      const created = await createRes.json();

      const response = await app.request(`/orders/${created.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: 'listing-1' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.lineItems).toHaveLength(1);
      expect(body.lineItems[0].listingId).toBe('listing-1');
    });

    it('returns 404 for non-existent listing', async () => {
      const createRes = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer-123',
          shippingAddress: shippingAddressData,
        }),
      });
      const created = await createRes.json();

      const response = await app.request(`/orders/${created.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: 'non-existent' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /orders/:id/items/:listingId', () => {
    it('removes a line item from the order', async () => {
      // Create order and add item
      const createRes = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer-123',
          shippingAddress: shippingAddressData,
        }),
      });
      const created = await createRes.json();

      await app.request(`/orders/${created.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: 'listing-1' }),
      });

      const response = await app.request(`/orders/${created.id}/items/listing-1`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.lineItems).toHaveLength(0);
    });
  });

  describe('POST /orders/:id/checkout', () => {
    it('starts checkout and holds listings', async () => {
      // Create order and add item
      const createRes = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer-123',
          shippingAddress: shippingAddressData,
        }),
      });
      const created = await createRes.json();

      await app.request(`/orders/${created.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: 'listing-1' }),
      });

      const response = await app.request(`/orders/${created.id}/checkout`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('payment_pending');
      expect(listingClient.isHeld('listing-1')).toBe(true);
    });
  });

  describe('POST /orders/:id/payment', () => {
    it('processes payment and confirms order', async () => {
      // Create order, add item, checkout
      const createRes = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer-123',
          shippingAddress: shippingAddressData,
        }),
      });
      const created = await createRes.json();

      await app.request(`/orders/${created.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: 'listing-1' }),
      });

      await app.request(`/orders/${created.id}/checkout`, { method: 'POST' });

      const response = await app.request(`/orders/${created.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'credit_card',
          transactionId: 'txn-123',
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('confirmed');
      expect(listingClient.isSold('listing-1')).toBe(true);
    });
  });

  describe('POST /orders/:id/ship', () => {
    it('marks order as shipped', async () => {
      // Create and complete order up to confirmed
      const createRes = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer-123',
          shippingAddress: shippingAddressData,
        }),
      });
      const created = await createRes.json();

      await app.request(`/orders/${created.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: 'listing-1' }),
      });

      await app.request(`/orders/${created.id}/checkout`, { method: 'POST' });
      await app.request(`/orders/${created.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'credit_card', transactionId: 'txn-123' }),
      });

      const response = await app.request(`/orders/${created.id}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: 'USPS',
          trackingNumber: '1234567890',
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('shipped');
      expect(body.shipmentTracking.carrier).toBe('USPS');
    });
  });

  describe('POST /orders/:id/delivered', () => {
    it('marks order as delivered', async () => {
      // Create and complete order up to shipped
      const createRes = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer-123',
          shippingAddress: shippingAddressData,
        }),
      });
      const created = await createRes.json();

      await app.request(`/orders/${created.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: 'listing-1' }),
      });

      await app.request(`/orders/${created.id}/checkout`, { method: 'POST' });
      await app.request(`/orders/${created.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'credit_card', transactionId: 'txn-123' }),
      });
      await app.request(`/orders/${created.id}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrier: 'USPS', trackingNumber: '123' }),
      });

      const response = await app.request(`/orders/${created.id}/delivered`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('completed');
    });
  });

  describe('POST /orders/:id/cancel', () => {
    it('cancels order and releases holds', async () => {
      // Create order, add item, checkout
      const createRes = await app.request('/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer-123',
          shippingAddress: shippingAddressData,
        }),
      });
      const created = await createRes.json();

      await app.request(`/orders/${created.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: 'listing-1' }),
      });

      await app.request(`/orders/${created.id}/checkout`, { method: 'POST' });

      const response = await app.request(`/orders/${created.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer request' }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe('cancelled');
      expect(body.cancelReason).toBe('Customer request');
      expect(listingClient.isHeld('listing-1')).toBe(false);
    });
  });
});
