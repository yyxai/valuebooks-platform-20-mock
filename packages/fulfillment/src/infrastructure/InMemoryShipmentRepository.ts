import type { Shipment } from '../domain/Shipment.js';
import type { ShipmentStatus } from '../domain/ShipmentStatus.js';
import type { ShipmentRepository } from './ShipmentRepository.js';

export class InMemoryShipmentRepository implements ShipmentRepository {
  private shipments = new Map<string, Shipment>();

  async save(shipment: Shipment): Promise<void> {
    this.shipments.set(shipment.id, shipment);
  }

  async findById(id: string): Promise<Shipment | null> {
    return this.shipments.get(id) ?? null;
  }

  async findByOrderId(orderId: string): Promise<Shipment | null> {
    for (const shipment of this.shipments.values()) {
      if (shipment.orderId === orderId) {
        return shipment;
      }
    }
    return null;
  }

  async findByStatus(status: ShipmentStatus): Promise<Shipment[]> {
    return Array.from(this.shipments.values()).filter(
      shipment => shipment.status === status
    );
  }

  async findAll(): Promise<Shipment[]> {
    return Array.from(this.shipments.values());
  }
}
