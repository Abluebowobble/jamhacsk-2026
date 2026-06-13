// Example controllers showing the three traffic directions this template covers:
//   1. handle a request from the frontend            -> health / echo
//   2. fetch data from the upstream/device backend   -> getStatus
//   3. push information to the backend OR frontend    -> sendCommand / notify
//
// Fastify handlers: return a value to send it as JSON, or use `reply` to set a
// status code. Thrown errors are caught by the central error handler.
//
// Replace these with real Hestia routes (devices, timers, events…) later.
import { upstream } from '../services/upstream.js';
import { eventBus } from '../services/eventBus.js';

// 1) Simple request from the frontend — no upstream involved.
export function health() {
  return { status: 'ok', uptime: process.uptime() };
}

// 1b) Echo back what the frontend posted (handy for wiring tests).
export function echo(req) {
  return { youSent: req.body };
}

// 2) Fetch data FROM the upstream/device backend and return it to the frontend.
export async function getStatus() {
  return upstream.get('/status'); // upstream endpoint, adjust freely
}

// 3a) Push information TO the upstream/device backend (e.g. turn stove off).
export async function sendCommand(req, reply) {
  const result = await upstream.post('/commands', req.body);
  reply.code(202).send(result);
}

// 3b) Push information TO the frontend in real time via SSE (see eventsController).
export function notify(req, reply) {
  const { type = 'message', payload = req.body } = req.body || {};
  eventBus.broadcast(type, payload);
  reply.code(202).send({ pushed: true, type });
}
