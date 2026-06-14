"""Web-based virtual stove knob — a drop-in replacement for the SG90 servo.

Implements the same ``on()`` / ``off()`` / ``close()`` actuator-backend contract
that :class:`src.stove.Stove` drives, but instead of moving a physical servo it
serves a browser page with an interactive knob and syncs state both ways:

  Hestia -> knob : ``Stove`` calls ``on()`` / ``off()`` (a backend command, a
                   timer, or an auto-shutoff). We broadcast the new state over
                   Server-Sent Events so every open knob rotates to match —
                   e.g. auto-shutoff visibly snaps the knob to OFF.
  knob -> Hestia : the user dragging the knob in the browser POSTs ``/knob``;
                   we invoke ``on_manual(on)`` so the firmware loop handles it
                   exactly like an MQTT stove command (arming/disarming safety
                   and publishing status). The real SG90 servo can't sense a
                   manual turn — this is a deliberate upgrade for the mock.

Mirrors :mod:`src.camera_stream`: a stdlib ``ThreadingHTTPServer`` in a daemon
thread, so there are no extra dependencies and the main loop is never blocked.

Endpoints
---------
- ``GET  /``         the knob page (``firmware/web/knob.html``)
- ``GET  /events``   ``text/event-stream`` — state pushes (SSE)
- ``POST /knob``     ``{"on": bool}`` — a user turn from the browser
- ``GET  /healthz``  plain ``ok`` (liveness check, no auth)
"""
import json
import logging
import os
import queue
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

log = logging.getLogger("hestia.stove_web")

_WEB_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web"
)
_HTML_PATH = os.path.join(_WEB_DIR, "knob.html")

# Shown if web/knob.html is somehow missing, so the server still responds.
_FALLBACK_HTML = (
    "<!doctype html><meta charset=utf-8><title>Hestia knob</title>"
    "<p>knob.html not found next to the firmware.</p>"
)

# How long an idle SSE connection waits before emitting a keep-alive comment, so
# proxies/tunnels don't drop the stream and a closed tab is noticed promptly.
_SSE_KEEPALIVE_SECONDS = 15


class WebKnobBackend:
    """A ``Stove`` backend that is a live web knob instead of a servo.

    Parameters
    ----------
    host, port
        Where the HTTP server binds. ``port=0`` picks a free port (read it back
        from :attr:`port` after :meth:`start`), which the tests rely on.
    token
        Optional shared secret. When set, ``/events`` and ``/knob`` require it
        (``?token=`` or the ``X-Knob-Token`` header) so the knob isn't an open
        stove switch when exposed beyond localhost. ``None`` = no auth.
    on_manual
        ``callback(on: bool)`` invoked when the *user* turns the knob in the
        browser. Wired by ``main.py`` to ``FirmwareLoop.on_command`` so a manual
        turn travels the same path as a backend MQTT command.
    """

    def __init__(self, *, host="0.0.0.0", port=8090, token=None, on_manual=None):
        self.host = host
        self.port = port
        self._token = token or None
        self.on_manual = on_manual

        self._on = False
        self._lock = threading.Lock()
        # One unbounded queue per connected SSE client; broadcast fans out to all.
        self._clients = set()

        self._httpd = None
        self._thread = None

    # --- lifecycle ----------------------------------------------------------
    def start(self):
        handler = _make_handler(self)
        self._httpd = ThreadingHTTPServer((self.host, self.port), handler)
        # Reflect the actual bound port back (matters when port=0 was requested).
        self.port = self._httpd.server_address[1]
        self._thread = threading.Thread(
            target=self._httpd.serve_forever, name="stove-knob-web", daemon=True
        )
        self._thread.start()
        log.info("Stove knob web UI serving on %s:%d%s", self.host, self.port,
                 " (token-gated)" if self._token else "")

    def stop(self):
        if self._httpd is not None:
            self._httpd.shutdown()
            self._httpd.server_close()
            self._httpd = None
            log.info("Stove knob web UI stopped")

    # --- actuator-backend contract (driven by Stove) ------------------------
    def on(self):
        """Hestia turned the stove ON — rotate every open knob to ON."""
        self._set(True, "device")

    def off(self):
        """Hestia turned the stove OFF — rotate every open knob to OFF."""
        self._set(False, "device")

    def close(self):
        self.stop()

    # --- internal -----------------------------------------------------------
    def _set(self, on, source):
        with self._lock:
            self._on = on
        self._broadcast({"on": on, "source": source})

    def _state_event(self, source):
        with self._lock:
            return {"on": self._on, "source": source}

    def _broadcast(self, payload):
        data = f"data: {json.dumps(payload)}\n\n".encode()
        with self._lock:
            clients = list(self._clients)
        for q in clients:
            q.put(data)

    def _register(self):
        q = queue.Queue()
        with self._lock:
            self._clients.add(q)
        return q

    def _unregister(self, q):
        with self._lock:
            self._clients.discard(q)

    def _auth_ok(self, parsed, headers):
        if not self._token:
            return True
        supplied = (parse_qs(parsed.query).get("token") or [None])[0]
        supplied = supplied or headers.get("X-Knob-Token")
        return supplied == self._token

    def _user_turn(self, on):
        """A user dragged the knob; hand it to the firmware loop (if wired)."""
        if self.on_manual is None:
            log.info("Knob turned %s in browser (no handler wired)",
                     "ON" if on else "OFF")
            return
        try:
            self.on_manual(bool(on))
        except Exception:
            log.exception("on_manual callback failed")


def _read_html():
    try:
        with open(_HTML_PATH, "rb") as fh:
            return fh.read()
    except OSError:
        return _FALLBACK_HTML.encode()


def _make_handler(backend):
    class _Handler(BaseHTTPRequestHandler):
        # Quiet by default — route stdlib request logging to our logger at debug.
        def log_message(self, fmt, *args):  # noqa: N802 (stdlib signature)
            log.debug("%s - %s", self.address_string(), fmt % args)

        # --- GET ------------------------------------------------------------
        def do_GET(self):  # noqa: N802 (stdlib signature)
            parsed = urlparse(self.path)
            if parsed.path == "/healthz":
                self._send_text(200, "ok")
            elif parsed.path in ("/", "/index.html"):
                self._send_bytes(200, "text/html; charset=utf-8", _read_html())
            elif parsed.path == "/events":
                self._handle_events(parsed)
            else:
                self._send_text(404, "not found")

        def _handle_events(self, parsed):
            if not backend._auth_ok(parsed, self.headers):
                self._send_text(401, "unauthorized")
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("X-Accel-Buffering", "no")  # don't buffer behind nginx
            self.end_headers()

            q = backend._register()
            try:
                # Send current state immediately so a fresh tab is in sync.
                init = backend._state_event("init")
                self.wfile.write(f"data: {json.dumps(init)}\n\n".encode())
                self.wfile.flush()
                while True:
                    try:
                        data = q.get(timeout=_SSE_KEEPALIVE_SECONDS)
                    except queue.Empty:
                        data = b": keepalive\n\n"
                    self.wfile.write(data)
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, ValueError):
                pass  # client closed the tab — normal end of stream
            finally:
                backend._unregister(q)

        # --- POST -----------------------------------------------------------
        def do_POST(self):  # noqa: N802 (stdlib signature)
            parsed = urlparse(self.path)
            if parsed.path != "/knob":
                self._send_text(404, "not found")
                return
            if not backend._auth_ok(parsed, self.headers):
                self._send_text(401, "unauthorized")
                return
            try:
                length = int(self.headers.get("Content-Length") or 0)
                body = self.rfile.read(length) if length else b"{}"
                payload = json.loads(body.decode() or "{}")
                on = bool(payload.get("on"))
            except (ValueError, UnicodeDecodeError):
                self._send_text(400, "bad request")
                return
            backend._user_turn(on)
            self._send_bytes(
                200, "application/json", json.dumps({"ok": True, "on": on}).encode()
            )

        # --- helpers --------------------------------------------------------
        def _send_bytes(self, code, content_type, payload):
            self.send_response(code)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            try:
                self.wfile.write(payload)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def _send_text(self, code, body):
            self._send_bytes(code, "text/plain; charset=utf-8", body.encode())

    return _Handler


def start(*, host="0.0.0.0", port=8090, token=None, on_manual=None) -> WebKnobBackend:
    """Create, start and return a :class:`WebKnobBackend` (caller stops it)."""
    backend = WebKnobBackend(host=host, port=port, token=token, on_manual=on_manual)
    backend.start()
    return backend
