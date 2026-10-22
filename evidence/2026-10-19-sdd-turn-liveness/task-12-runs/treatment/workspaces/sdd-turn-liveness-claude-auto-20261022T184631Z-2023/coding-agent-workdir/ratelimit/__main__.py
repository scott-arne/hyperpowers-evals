"""Command line: python3 -m ratelimit simulate --limit N --window S --calls C."""

import argparse
import sys

from ratelimit.clock import FakeClock
from ratelimit.window import SlidingWindowLimiter

STEP_SECONDS = 0.1


def simulate(limit: int, window: float, calls: int) -> str:
    clock = FakeClock()
    limiter = SlidingWindowLimiter(limit=limit, window_seconds=window, clock=clock)
    allowed = 0
    for _ in range(calls):
        if limiter.allow():
            allowed += 1
        clock.advance(STEP_SECONDS)
    return f"allowed={allowed} denied={calls - allowed}"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="python3 -m ratelimit")
    commands = parser.add_subparsers(dest="command", required=True)
    sim = commands.add_parser("simulate", help="drive a sliding window with a fake clock")
    sim.add_argument("--limit", type=int, required=True)
    sim.add_argument("--window", type=float, required=True)
    sim.add_argument("--calls", type=int, required=True)
    args = parser.parse_args(argv)
    print(simulate(args.limit, args.window, args.calls))
    return 0


if __name__ == "__main__":
    sys.exit(main())
