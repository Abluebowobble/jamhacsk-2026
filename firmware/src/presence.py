"""Camera-based presence detection (Pi Camera + OpenCV).

Decides whether a person is near the stove (PRD FR6 / section 12.1). This is
the *vision* half of Hestia; the safety state machine (absence timeout ->
warning -> auto-shutoff) consumes the boolean this produces.

Design
------
- **Detector backend is swappable.** Default is OpenCV's DNN MobileNet-SSD
  ("person" class), which gives real person detection (a stationary cook still
  counts as present, unlike motion detection) and tells people apart from pets
  (animals are separate classes and ignored). If the model files aren't present,
  it falls back to OpenCV's built-in HOG people detector so the code always runs.
- **Capture is swappable too.** picamera2 on the Pi; OpenCV VideoCapture as a
  fallback so you can develop against a laptop webcam.
- **Degrades gracefully.** If no camera or vision libraries are available
  (e.g. running the firmware on a dev machine), construction raises
  ``PresenceUnavailable`` and the caller keeps the rest of the device running.

Public surface
--------------
- ``PresenceMonitor`` — capture + detect + debounce; call ``poll()`` in a loop.

Self-test (no MQTT broker, no Pi needed)
----------------------------------------
- ``python -m src.presence``            live webcam, draws boxes + prints state
- ``python -m src.presence --image X``  run on a still image (person vs pet)
- ``python -m src.presence --video X``  run on a video file
"""

# NOTE IF CAMERA BREAKS THE ENTIRE SYSTEM GETS STUCK. RECTIFY OUT OF MVP.

import argparse
import logging
import os
import threading
import time
from dataclasses import dataclass, field
from typing import Callable, List, Optional, Tuple

from .util import env_float as _env_float, env_int as _env_int

log = logging.getLogger("hestia.presence")


class PresenceUnavailable(RuntimeError):
    """Raised when no working camera + detector can be initialised."""


# --- configuration ----------------------------------------------------------
def _parse_roi(raw):
    """Parse 'x0,y0,x1,y1' fractional ROI; default to the full frame."""
    if not raw:
        return (0.0, 0.0, 1.0, 1.0)
    try:
        x0, y0, x1, y1 = (float(p) for p in raw.split(","))
        return (x0, y0, x1, y1)
    except (ValueError, TypeError):
        log.warning("Bad PRESENCE_ROI %r — using full frame", raw)
        return (0.0, 0.0, 1.0, 1.0)


@dataclass(frozen=True)
class PresenceConfig:
    """Tunables for presence detection (all overridable via env)."""

    # Detection
    confidence_threshold: float = field(
        default_factory=lambda: _env_float("PRESENCE_CONFIDENCE", 0.5)
    )
    # Ignore tiny detections far away — a person "near the stove" fills a
    # meaningful fraction of the frame. Fraction of frame area (0..1).
    min_box_area_frac: float = field(
        default_factory=lambda: _env_float("PRESENCE_MIN_BOX_AREA", 0.02)
    )
    # Region of interest as fractional (x0, y0, x1, y1); detections are only
    # counted if their centre falls inside it. Default = whole frame.
    roi: Tuple[float, float, float, float] = field(
        default_factory=lambda: _parse_roi(os.environ.get("PRESENCE_ROI"))
    )

    # Debounce: how many consecutive polls of a new state before we trust it.
    # Stops flicker (and event spam) at the detection boundary.
    debounce_frames: int = field(
        default_factory=lambda: _env_int("PRESENCE_DEBOUNCE_FRAMES", 3)
    )

    # Capture
    camera_index: int = field(
        default_factory=lambda: _env_int("PRESENCE_CAMERA_INDEX", 0)
    )
    frame_width: int = field(
        default_factory=lambda: _env_int("PRESENCE_FRAME_WIDTH", 640)
    )
    frame_height: int = field(
        default_factory=lambda: _env_int("PRESENCE_FRAME_HEIGHT", 480)
    )

    # Model files (OpenCV DNN MobileNet-SSD, Caffe). Relative paths resolve
    # against firmware/models/. Missing files -> HOG fallback.
    model_dir: str = field(
        default_factory=lambda: os.environ.get(
            "PRESENCE_MODEL_DIR",
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "models"),
        )
    )
    prototxt: str = "MobileNetSSD_deploy.prototxt"
    caffemodel: str = "MobileNetSSD_deploy.caffemodel"

    def model_paths(self):
        return (
            os.path.join(self.model_dir, self.prototxt),
            os.path.join(self.model_dir, self.caffemodel),
        )


@dataclass
class PresenceResult:
    """Outcome of a single detection pass."""

    detected: bool
    confidence: float  # best person-box confidence this frame (0 if none)
    boxes: List[Tuple[int, int, int, int]]  # accepted person boxes (px)


# --- cameras ----------------------------------------------------------------
class _Camera:
    """Minimal capture interface: read() -> BGR ndarray, or None on failure."""

    def read(self):  # pragma: no cover - hardware
        raise NotImplementedError

    def close(self):  # pragma: no cover - hardware
        pass


class _PiCamera(_Camera):
    """Raspberry Pi Camera via picamera2."""

    def __init__(self, cfg):
        from picamera2 import Picamera2  # local import: Pi-only dependency

        self._cam = Picamera2()
        config = self._cam.create_preview_configuration(
            main={"size": (cfg.frame_width, cfg.frame_height), "format": "RGB888"}
        )
        self._cam.configure(config)
        self._cam.start()
        time.sleep(0.5)  # let auto-exposure settle
        log.info("Using picamera2 (%dx%d)", cfg.frame_width, cfg.frame_height)

    def read(self):
        frame_rgb = self._cam.capture_array()
        # picamera2 gives RGB; OpenCV/DNN expect BGR.
        return frame_rgb[:, :, ::-1].copy()

    def close(self):
        try:
            self._cam.stop()
        except Exception:
            pass


class _OpenCvCamera(_Camera):
    """USB/laptop webcam via OpenCV — used for development off-Pi."""

    def __init__(self, cfg, cv2_mod):
        self._cv2 = cv2_mod
        self._cap = cv2_mod.VideoCapture(cfg.camera_index)
        if not self._cap.isOpened():
            raise PresenceUnavailable(f"OpenCV camera {cfg.camera_index} not available")
        self._cap.set(cv2_mod.CAP_PROP_FRAME_WIDTH, cfg.frame_width)
        self._cap.set(cv2_mod.CAP_PROP_FRAME_HEIGHT, cfg.frame_height)
        log.info("Using OpenCV VideoCapture(%d)", cfg.camera_index)

    def read(self):
        ok, frame = self._cap.read()
        return frame if ok else None

    def close(self):
        try:
            self._cap.release()
        except Exception:
            pass


def _open_camera(cfg, cv2_mod):
    """Prefer the Pi Camera; fall back to a generic OpenCV capture."""
    try:
        return _PiCamera(cfg)
    except Exception as exc:  # picamera2 missing or no Pi camera
        log.info("picamera2 unavailable (%s) — trying OpenCV capture", exc)
    return _OpenCvCamera(cfg, cv2_mod)


# --- detectors --------------------------------------------------------------
# VOC class index for "person" in MobileNet-SSD (Caffe). Other classes (cat,
# dog, bird, cow, horse, sheep, ...) exist and are ignored, so pets don't count.
_PERSON_CLASS_ID = 15


class _Detector:
    def detect(self, frame) -> Tuple[float, list]:
        """Return (best_person_confidence, [boxes]) for the frame."""
        raise NotImplementedError


class _DnnDetector(_Detector):
    """OpenCV DNN MobileNet-SSD — the primary, accurate backend."""

    def __init__(self, cfg, cv2_mod):
        self._cv2 = cv2_mod
        self._cfg = cfg
        proto, model = cfg.model_paths()
        self._net = cv2_mod.dnn.readNetFromCaffe(proto, model)
        log.info("Presence backend: OpenCV DNN MobileNet-SSD")

    def detect(self, frame):
        cv2 = self._cv2
        h, w = frame.shape[:2]
        blob = cv2.dnn.blobFromImage(frame, 0.007843, (300, 300), 127.5)
        self._net.setInput(blob)
        detections = self._net.forward()

        best = 0.0
        boxes = []
        for i in range(detections.shape[2]):
            confidence = float(detections[0, 0, i, 2])
            class_id = int(detections[0, 0, i, 1])
            if class_id != _PERSON_CLASS_ID:
                continue  # ignore non-person classes (animals, furniture, ...)
            if confidence < self._cfg.confidence_threshold:
                continue
            x0 = int(detections[0, 0, i, 3] * w)
            y0 = int(detections[0, 0, i, 4] * h)
            x1 = int(detections[0, 0, i, 5] * w)
            y1 = int(detections[0, 0, i, 6] * h)
            boxes.append((x0, y0, x1, y1))
            best = max(best, confidence)
        return best, boxes


class _HogDetector(_Detector):
    """OpenCV HOG people detector — zero-model fallback."""

    def __init__(self, cfg, cv2_mod):
        self._cv2 = cv2_mod
        self._cfg = cfg
        self._hog = cv2_mod.HOGDescriptor()
        self._hog.setSVMDetector(cv2_mod.HOGDescriptor_getDefaultPeopleDetector())
        log.info("Presence backend: OpenCV HOG (fallback — no model files found)")

    def detect(self, frame):
        rects, weights = self._hog.detectMultiScale(
            frame, winStride=(8, 8), padding=(8, 8), scale=1.05
        )
        best = 0.0
        boxes = []
        for (x, y, bw, bh), weight in zip(rects, weights):
            # HOG weights aren't probabilities; treat the SVM margin as a score.
            conf = float(weight)
            if conf < self._cfg.confidence_threshold:
                continue
            boxes.append((x, y, x + bw, y + bh))
            best = max(best, conf)
        return best, boxes


def _build_detector(cfg, cv2_mod):
    proto, model = cfg.model_paths()
    if os.path.exists(proto) and os.path.exists(model):
        try:
            return _DnnDetector(cfg, cv2_mod)
        except Exception as exc:
            log.warning("DNN detector failed to load (%s) — falling back to HOG", exc)
    else:
        log.info("Model files not found in %s — using HOG fallback", cfg.model_dir)
    return _HogDetector(cfg, cv2_mod)


# --- monitor ----------------------------------------------------------------
class PresenceMonitor:
    """Owns the camera + detector and produces a debounced presence boolean.

    Typical use::

        monitor = PresenceMonitor(on_change=lambda present: ...)
        monitor.start()
        while running:
            monitor.poll()
            time.sleep(0.5)
        monitor.stop()

    ``on_change`` is the seam for the safety state machine: it fires only when
    the *debounced* presence state flips, so safety.on_presence() can drive the
    absence timer without worrying about per-frame jitter.
    """

    def __init__(self, config: Optional[PresenceConfig] = None,
                 on_change: Optional[Callable[[bool], None]] = None):
        self.cfg = config or PresenceConfig()
        self._on_change = on_change
        self._cv2 = None
        self._camera = None
        self._detector = None

        # Debounce state.
        self._stable_state: Optional[bool] = None  # last trusted presence
        self._pending_state: Optional[bool] = None
        self._pending_count = 0

        # Latest captured BGR frame, shared with the optional MJPEG stream
        # server (src/camera_stream.py). The stream re-serves whatever the
        # detector last saw, so the single physical camera is never opened
        # twice (USB/Pi cameras don't allow concurrent handles).
        self._frame_lock = threading.Lock()
        self._latest_frame = None

    def start(self):
        """Initialise vision libraries, camera and detector.

        Raises ``PresenceUnavailable`` if the environment can't support
        detection (missing OpenCV, no camera, etc.).
        """
        try:
            import cv2
        except ImportError as exc:
            raise PresenceUnavailable(f"vision libraries missing: {exc}") from exc

        self._cv2 = cv2
        self._camera = _open_camera(self.cfg, cv2)
        self._detector = _build_detector(self.cfg, cv2)
        log.info("Presence monitor ready")

    def _accept_box(self, box, frame_shape):
        """Filter a raw detection by ROI (centre) and minimum size."""
        h, w = frame_shape[:2]
        x0, y0, x1, y1 = box
        area_frac = (max(0, x1 - x0) * max(0, y1 - y0)) / float(w * h)
        if area_frac < self.cfg.min_box_area_frac:
            return False
        cx = (x0 + x1) / 2 / w
        cy = (y0 + y1) / 2 / h
        rx0, ry0, rx1, ry1 = self.cfg.roi
        return rx0 <= cx <= rx1 and ry0 <= cy <= ry1

    def detect_frame(self, frame) -> PresenceResult:
        """Run detection on an already-captured BGR frame (no debounce)."""
        best, raw_boxes = self._detector.detect(frame)
        boxes = [b for b in raw_boxes if self._accept_box(b, frame.shape)]
        return PresenceResult(detected=bool(boxes), confidence=best, boxes=boxes)

    def detect_once(self) -> Optional[PresenceResult]:
        """Capture one frame and run detection. No debounce. None on failure."""
        if self._camera is None:
            raise PresenceUnavailable("monitor not started")
        frame = self._camera.read()
        if frame is None:
            log.warning("Camera returned no frame")
            return None
        # Publish the raw frame for the MJPEG stream before detection.
        with self._frame_lock:
            self._latest_frame = frame
        return self.detect_frame(frame)

    def latest_jpeg(self, quality: int = 60) -> Optional[bytes]:
        """JPEG-encode the most recently captured frame for streaming.

        Returns the encoded bytes, or ``None`` if no frame has been captured
        yet (or encoding fails). Thread-safe: called from the stream server's
        background thread while the main loop keeps polling.
        """
        with self._frame_lock:
            frame = self._latest_frame
        if frame is None or self._cv2 is None:
            return None
        ok, buf = self._cv2.imencode(
            ".jpg", frame, [self._cv2.IMWRITE_JPEG_QUALITY, int(quality)]
        )
        return buf.tobytes() if ok else None

    def poll(self) -> Optional[PresenceResult]:
        """Detect once and apply debounce; fire on_change on a stable flip.

        Returns the raw (per-frame) result, or None if the frame failed.
        """
        result = self.detect_once()
        if result is None:
            return None
        self._apply_debounce(result.detected)
        return result

    def _apply_debounce(self, detected: bool):
        # First ever reading establishes the baseline immediately.
        if self._stable_state is None:
            self._stable_state = detected
            self._fire(detected)
            return

        if detected == self._stable_state:
            self._pending_state = None
            self._pending_count = 0
            return

        # Candidate for a state change — needs N consecutive agreeing frames.
        if detected == self._pending_state:
            self._pending_count += 1
        else:
            self._pending_state = detected
            self._pending_count = 1

        if self._pending_count >= self.cfg.debounce_frames:
            self._stable_state = detected
            self._pending_state = None
            self._pending_count = 0
            self._fire(detected)

    def _fire(self, detected: bool):
        log.info("Presence state -> %s", "DETECTED" if detected else "NOT detected")
        if self._on_change:
            try:
                self._on_change(detected)
            except Exception:
                log.exception("presence on_change callback failed")

    @property
    def state(self) -> Optional[bool]:
        """Current debounced presence state (None until first poll)."""
        return self._stable_state

    def stop(self):
        if self._camera:
            self._camera.close()
            self._camera = None


# --- self-test (broker-free verification) -----------------------------------
def _draw(cv2, frame, result: PresenceResult):
    colour = (0, 200, 0) if result.detected else (0, 0, 200)
    for (x0, y0, x1, y1) in result.boxes:
        cv2.rectangle(frame, (x0, y0), (x1, y1), colour, 2)
    label = f"{'PERSON' if result.detected else 'no person'} ({result.confidence:.2f})"
    cv2.putText(frame, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, colour, 2)
    return frame


def _run_self_test(args):
    """Standalone detection demo — no MQTT, no Pi required."""
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    try:
        import cv2
    except ImportError:
        raise SystemExit("opencv-python is required: pip install opencv-python numpy")

    cfg = PresenceConfig()
    monitor = PresenceMonitor(cfg)
    monitor._cv2 = cv2
    monitor._detector = _build_detector(cfg, cv2)

    # Try to show a window; fall back to headless console output if no display.
    can_show = True

    def show(frame):
        nonlocal can_show
        if not can_show:
            return
        try:
            cv2.imshow("Hestia presence self-test", frame)
            return cv2.waitKey(1) & 0xFF == ord("q")
        except cv2.error:
            can_show = False
            log.info("No display available — running headless")
        return False

    if args.image:
        frame = cv2.imread(args.image)
        if frame is None:
            raise SystemExit(f"Could not read image: {args.image}")
        result = monitor.detect_frame(frame)
        print(f"{args.image}: detected={result.detected} "
              f"confidence={result.confidence:.3f} boxes={len(result.boxes)}")
        show(_draw(cv2, frame, result))
        if can_show:
            print("Press any key in the window to close…")
            cv2.waitKey(0)
        return

    source = args.video if args.video else cfg.camera_index
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        raise SystemExit(f"Could not open capture source: {source!r}")
    log.info("Running detection on %s — Ctrl+C (or 'q' in window) to stop", source)
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            result = monitor.detect_frame(frame)
            print(f"detected={result.detected} confidence={result.confidence:.3f} "
                  f"boxes={len(result.boxes)}", end="\r", flush=True)
            if show(_draw(cv2, frame, result)):
                break
    except KeyboardInterrupt:
        pass
    finally:
        cap.release()
        if can_show:
            cv2.destroyAllWindows()
        print()


def _main():
    parser = argparse.ArgumentParser(description="Hestia presence detection self-test")
    parser.add_argument("--image", help="run detection on a still image")
    parser.add_argument("--video", help="run detection on a video file")
    _run_self_test(parser.parse_args())


if __name__ == "__main__":
    _main()
