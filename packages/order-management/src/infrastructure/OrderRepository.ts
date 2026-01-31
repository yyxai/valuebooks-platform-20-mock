import type { Order } from '../domain/Order.js';

export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findByCustomerId(customerId: string): Promise<Order[]>;
  findExpiredCheckouts(timeoutMs?: number): Promise<Order[]>;
  findAll(): Promise<Order[]>;
}
