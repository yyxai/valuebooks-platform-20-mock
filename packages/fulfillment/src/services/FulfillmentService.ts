import type { EventBus } from '@valuebooks/shared';
import { Shipment } from '../domain/Shipment.js';
import type { Address } from '../domain/Address.js';
import type { Carrier } from '../domain/Carrier.js';
import type { ShipmentStatus } from '../domain/ShipmentStatus.js';
import { ShipmentEventTypes } from '../domain/events/index.js';
import type { ShipmentRepository } from '../infrastructure/ShipmentRepository.js';

export class FulfillmentService {
  constructor(
    private repository: ShipmentRepository,
    private eventBus: EventBus
  ) {}

  async createShipment(orderId: string, shippingAddress: Address): Promise<Shipment> {
    const shipment = Shipment.create({ orderId, shippingAddress });
    await this.repository.save(shipment);

    this.eventBus.publish({
      type: ShipmentEventTypes.CREATED,
      payload: {
        shipmentId: shipment.id,
        orderId: shipment.orderId,
        shippingAddress: shippingAddress.toJSON(),
      },
      timestamp: new Date(),
    });

    return shipment;
  }

  async startPicking(shipmentId: string): Promise<Shipment> {
    const shipment = await this.getShipmentOrThrow(shipmentId);
    const updated = shipment.startPicking();
    await this.repository.save(updated);

    this.eventBus.publish({
      type: ShipmentEventTypes.PICKING,
      payload: {
        shipmentId: updated.id,
        orderId: updated.orderId,
        status: updated.status,
      },
      timestamp: new Date(),
    });

    return updated;
  }

  async markPacked(shipmentId: string): Promise<Shipment> {
    const shipment = await this.getShipmentOrThrow(shipmentId);
    const updated = shipment.markPacked();
    await this.repository.save(updated);

    this.eventBus.publish({
      type: ShipmentEventTypes.PACKED,
      payload: {
        shipmentId: updated.id,
        orderId: updated.orderId,
        status: updated.status,
      },
      timestamp: new Date(),
    });

    return updated;
  }

  async dispatch(
    shipmentId: string,
    carrier: Carrier,
    trackingNumber: string
  ): Promise<Shipment> {
    const shipment = await this.getShipmentOrThrow(shipmentId);
    const updated = shipment.dispatch(carrier, trackingNumber);
    await this.repository.save(updated);

    this.eventBus.publish({
      type: ShipmentEventTypes.DISPATCHED,
      payload: {
        shipmentId: updated.id,
        orderId: updated.orderId,
        carrier: updated.carrier!,
        trackingNumber: updated.trackingNumber!,
        trackingUrl: updated.trackingUrl!,
      },
      timestamp: new Date(),
    });

    return updated;
  }

  async updateInTransit(shipmentId: string): Promise<Shipment> {
    const shipment = await this.getShipmentOrThrow(shipmentId);
    const updated = shipment.updateInTransit();
    await this.repository.save(updated);

    this.eventBus.publish({
      type: ShipmentEventTypes.IN_TRANSIT,
      payload: {
        shipmentId: updated.id,
        orderId: updated.orderId,
        status: updated.status,
      },
      timestamp: new Date(),
    });

    return updated;
  }

  async markDelivered(shipmentId: string): Promise<Shipment> {
    const shipment = await this.getShipmentOrThrow(shipmentId);
    const updated = shipment.markDelivered();
    await this.repository.save(updated);

    this.eventBus.publish({
      type: ShipmentEventTypes.DELIVERED,
      payload: {
        shipmentId: updated.id,
        orderId: updated.orderId,
        deliveredAt: updated.deliveredAt!,
      },
      timestamp: new Date(),
    });

    return updated;
  }

  async getByOrderId(orderId: string): Promise<Shipment | null> {
    return this.repository.findByOrderId(orderId);
  }

  async getShipmentsByStatus(status: ShipmentStatus): Promise<Shipment[]> {
    return this.repository.findByStatus(status);
  }

  async getAllShipments(): Promise<Shipment[]> {
    return this.repository.findAll();
  }

  private async getShipmentOrThrow(shipmentId: string): Promise<Shipment> {
    const shipment = await this.repository.findById(shipmentId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }
    return shipment;
  }
}
