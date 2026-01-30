// packages/shared/src/events/EventBus.test.ts
import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './EventBus.js';

describe('EventBus', () => {
  it('should notify subscribers when event is published', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.subscribe('TestEvent', handler);
    bus.publish({ type: 'TestEvent', payload: { id: '123' }, timestamp: new Date() });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'TestEvent' }));
  });

  it('should not notify unsubscribed handlers', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    const unsubscribe = bus.subscribe('TestEvent', handler);
    unsubscribe();
    bus.publish({ type: 'TestEvent', payload: {}, timestamp: new Date() });

    expect(handler).not.toHaveBeenCalled();
  });
});
