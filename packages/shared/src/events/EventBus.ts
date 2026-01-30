import { DomainEvent } from './DomainEvent.js';

type EventHandler = (event: DomainEvent) => void;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  publish(event: DomainEvent): void {
    this.handlers.get(event.type)?.forEach(handler => handler(event));
  }
}
