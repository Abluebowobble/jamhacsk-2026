// In-memory pub/sub used to PUSH events to connected frontends over SSE
// (Server-Sent Events). Any part of the backend can call broadcast() and every
// browser listening on the SSE endpoint receives it instantly.
//
// Note: in-memory only, so it works for a single server instance. If you scale
// to multiple Vultr instances later, back this with Redis pub/sub or similar.
import { EventEmitter } from 'node:events';

const emitter = new EventEmitter();
emitter.setMaxListeners(0); // many SSE clients

export const eventBus = {
  // Send an event to all subscribers. type -> SSE "event:" name, payload -> data.
  broadcast(type, payload) {
    emitter.emit('event', { type, payload, ts: new Date().toISOString() });
  },
  subscribe(listener) {
    emitter.on('event', listener);
    return () => emitter.off('event', listener); // unsubscribe
  },
};
