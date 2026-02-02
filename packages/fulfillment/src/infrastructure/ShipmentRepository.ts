import type { Shipment } from '../domain/Shipment.js';
import type { ShipmentStatus } from '../domain/ShipmentStatus.js';

export interface ShipmentRepository {
  save(shipment: Shipment): Promise<void>;
  findById(id: string): Promise<Shipment | null>;
  findByOrderId(orderId: string): Promise<Shipment | null>;
  findByStatus(status: ShipmentStatus): Promise<Shipment[]>;
  findAll(): Promise<Shipment[]>;
}
