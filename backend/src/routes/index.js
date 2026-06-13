// All API routes, mounted under config.apiPrefix (default /api) in app.js.
import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  health,
  echo,
  getStatus,
  sendCommand,
  notify,
} from '../controllers/exampleController.js';
import { stream } from '../controllers/eventsController.js';

const router = Router();

// Frontend -> backend
router.get('/health', health);
router.post('/echo', echo);

// Backend <- upstream/device backend  (fetch data)
router.get('/status', asyncHandler(getStatus));

// Backend -> upstream/device backend  (push data)
router.post('/commands', asyncHandler(sendCommand));

// Backend -> frontend  (push data, real-time)
router.get('/events', stream); // SSE stream
router.post('/notify', notify); // trigger a push to all SSE clients

export default router;
