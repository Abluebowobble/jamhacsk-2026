// Example controllers showing the three traffic directions this template covers:
//   1. handle a request from the frontend            -> health / echo
//   2. fetch data from the upstream/device backend   -> getStatus
//   3. push information to the backend OR frontend    -> sendCommand / notify
//
// Replace these with real Hestia routes (devices, timers, events…) later.
import { upstream } from '../services/upstream.js';
import { eventBus } from '../services/eventBus.js';

// 1) Simple request from the frontend — no upstream involved.
export function health(req, res) {
  res.json({ status: 'ok', uptime: process.uptime() });
}

// 1b) Echo back what the frontend posted (handy for wiring tests).
export function echo(req, res) {
  res.json({ youSent: req.body });
}

// 2) Fetch data FROM the upstream/device backend and return it to the frontend.
export async function getStatus(req, res) {
  const data = await upstream.get('/status'); // upstream endpoint, adjust freely
  res.json(data);
}

// 3a) Push information TO the upstream/device backend (e.g. turn stove off).
export async function sendCommand(req, res) {
  const result = await upstream.post('/commands', req.body);
  res.status(202).json(result);
}

// 3b) Push information TO the frontend in real time via SSE (see eventsController).
export function notify(req, res) {
  const { type = 'message', payload = req.body } = req.body || {};
  eventBus.broadcast(type, payload);
  res.status(202).json({ pushed: true, type });
}
