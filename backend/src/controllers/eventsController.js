// SSE endpoint: the frontend opens an EventSource here and receives every event
// broadcast via eventBus — this is the "push to the frontend" channel.
//
// Frontend usage:
//   const es = new EventSource('/api/events');
//   es.onmessage = (e) => console.log(JSON.parse(e.data));
import { eventBus } from '../services/eventBus.js';

export function stream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('retry: 3000\n\n'); // tell client to reconnect after 3s if dropped

  // Greet the client so it knows the stream is live.
  res.write(`event: connected\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`);

  const unsubscribe = eventBus.subscribe((evt) => {
    res.write(`event: ${evt.type}\n`);
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  });

  // Heartbeat keeps proxies/load balancers from closing an idle connection.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}
