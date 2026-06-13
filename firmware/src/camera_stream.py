"""Token-gated MJPEG camera stream for the Hestia device (PRD section 13).

The browser connects **directly** to this server (through a Cloudflare Tunnel in
deployment); the backend never proxies the video. Access is gated by a
short-lived HMAC token the backend mints with the shared ``CAMERA_STREAM_SECRET``
(see backend/src/lib/cameraToken.js). The token only gates *connecting* — once
the MJPEG socket is open it stays open.

Frames are whatever the presence loop last captured (``PresenceMonitor.latest_jpeg``),
so the single physical camera is never opened twice. The HTTP server runs in a
background daemon thread; presence detection keeps running on the main thread.

Endpoints
---------
- ``GET /stream?token=...``  multipart/x-mixed-replace MJPEG (401 on bad token)
- ``GET /healthz``           plain ``ok`` (tunnel/liveness check, no auth)
"""
import hashlib
import hmac
import logging
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

log = logging.getLogger("hestia.camera_stream")


def verify_token(token: str, device_id: str, secret: str) -> bool:
    """Validate a ``{deviceId}.{exp}.{sig}`` HMAC token (mirrors the backend).

    Checks the signature (constant-time), that it was minted for *this* device,
    and that it has not expired.
    """
    if not token or not secret:
        return False
    parts = token.split(".")
    if len(parts) != 3:
        return False
    tok_device, exp_raw, sig = parts
    if tok_device != device_id:
        return False
    try:
        exp = int(exp_raw)
    except ValueError:
        return False
    if exp < int(time.time()):
        return False
    msg = f"{tok_device}.{exp_raw}".encode()
    expected = hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)


def _make_handler(monitor, config):
    class _Handler(BaseHTTPRequestHandler):
        # Quiet by default — route request logging through our logger at debug.
        def log_message(self, fmt, *args):  # noqa: N802 (stdlib signature)
            log.debug("%s - %s", self.address_string(), fmt % args)

        def do_GET(self):  # noqa: N802 (stdlib signature)
            parsed = urlparse(self.path)
            if parsed.path == "/healthz":
                self._send_text(200, "ok")
                return
            if parsed.path == "/stream":
                self._handle_stream(parsed)
                return
            self._send_text(404, "not found")

        def _handle_stream(self, parsed):
            token = (parse_qs(parsed.query).get("token") or [""])[0]
            if not verify_token(token, config.device_id, config.camera_stream_secret):
                self._send_text(401, "unauthorized")
                return

            self.send_response(200)
            self.send_header("Age", "0")
            self.send_header("Cache-Control", "no-cache, private")
            self.send_header("Pragma", "no-cache")
            self.send_header(
                "Content-Type", "multipart/x-mixed-replace; boundary=frame"
            )
            self.end_headers()

            interval = 1.0 / max(1, config.camera_stream_fps)
            try:
                while True:
                    jpg = monitor.latest_jpeg(config.camera_stream_jpeg_quality)
                    if jpg is not None:
                        self.wfile.write(b"--frame\r\n")
                        self.wfile.write(b"Content-Type: image/jpeg\r\n")
                        self.wfile.write(
                            f"Content-Length: {len(jpg)}\r\n\r\n".encode()
                        )
                        self.wfile.write(jpg)
                        self.wfile.write(b"\r\n")
                    time.sleep(interval)
            except (BrokenPipeError, ConnectionResetError):
                # Viewer closed the tab / modal — normal end of stream.
                log.debug("Stream client disconnected")

        def _send_text(self, code, body):
            payload = body.encode()
            self.send_response(code)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            try:
                self.wfile.write(payload)
            except (BrokenPipeError, ConnectionResetError):
                pass

    return _Handler


class StreamServer:
    """Background MJPEG server bound to the device's presence monitor."""

    def __init__(self, monitor, config):
        self.monitor = monitor
        self.config = config
        self._httpd = None
        self._thread = None

    def start(self):
        handler = _make_handler(self.monitor, self.config)
        self._httpd = ThreadingHTTPServer(
            ("0.0.0.0", self.config.camera_stream_port), handler
        )
        self._thread = threading.Thread(
            target=self._httpd.serve_forever, name="camera-stream", daemon=True
        )
        self._thread.start()
        log.info(
            "Camera stream serving on :%d (fps=%d, quality=%d)",
            self.config.camera_stream_port,
            self.config.camera_stream_fps,
            self.config.camera_stream_jpeg_quality,
        )

    def stop(self):
        if self._httpd is not None:
            self._httpd.shutdown()
            self._httpd.server_close()
            self._httpd = None
            log.info("Camera stream stopped")


def start(monitor, config) -> StreamServer:
    """Create and start the MJPEG stream server. Returns it so the caller can stop()."""
    server = StreamServer(monitor, config)
    server.start()
    return server
