"""Manual servo test — drive the stove on and off a few times.

Exercises the real ``Stove`` actuator (src/stove.py): on the Pi it sweeps the
SG90 servo between the ON angle and the OFF angle; off-Pi it falls back to the
simulated backend and just logs each action, so the script runs anywhere.

Run from the ``firmware/`` directory::

    python test_servo.py                 # 3 on/off cycles, 2s dwell each
    python test_servo.py -n 5 -d 1.0     # 5 cycles, 1s between switches
    .venv/bin/python test_servo.py       # on the Pi (real servo)

Honors the same env as the firmware (STOVE_SERVO_PIN, STOVE_ON_ANGLE, etc.).
Ctrl+C stops early and always leaves the stove OFF.
"""
import argparse
import logging
import time

from src.stove import Stove

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("hestia.test_servo")


def main():
    parser = argparse.ArgumentParser(description="Drive the stove servo on/off.")
    parser.add_argument("-n", "--cycles", type=int, default=3,
                        help="number of on/off cycles (default: 3)")
    parser.add_argument("-d", "--dwell", type=float, default=2.0,
                        help="seconds to hold each state (default: 2.0)")
    args = parser.parse_args()

    stove = Stove()
    log.info("Starting servo test: %d cycle(s), %.1fs dwell (on_angle=%s°)",
             args.cycles, args.dwell, stove._on_angle)
    try:
        for i in range(1, args.cycles + 1):
            log.info("[cycle %d/%d] turning ON", i, args.cycles)
            stove.turn_on()
            log.info("  is_on=%s angle=%s°", stove.is_on, stove._angle)
            time.sleep(args.dwell)

            log.info("[cycle %d/%d] turning OFF", i, args.cycles)
            stove.turn_off()
            log.info("  is_on=%s angle=%s°", stove.is_on, stove._angle)
            time.sleep(args.dwell)
    except KeyboardInterrupt:
        log.info("Interrupted — stopping.")
    finally:
        # Always leave the stove off and release the servo.
        stove.turn_off()
        stove.close()
        log.info("Done — stove OFF, servo released.")


if __name__ == "__main__":
    main()
