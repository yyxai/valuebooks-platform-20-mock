import type { Order } from '../domain/Order.js';
import { OrderStatus } from '../domain/OrderStatus.js';
import type { OrderRepository } from './OrderRepository.js';

const DEFAULT_CHECKOUT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      order => order.customerId === customerId
    );
  }

  async findExpiredCheckouts(
    timeoutMs: number = DEFAULT_CHECKOUT_TIMEOUT_MS
  ): Promise<Order[]> {
    const now = Date.now();
    return Array.from(this.orders.values()).filter(order => {
      // Find orders in checkout or payment pending that have timed out
      if (
        order.status !== OrderStatus.CheckingOut &&
        order.status !== OrderStatus.PaymentPending
      ) {
        return false;
      }
      const checkoutAge = now - order.updatedAt.getTime();
      return checkoutAge > timeoutMs;
    });
  }

  async findAll(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }
}
