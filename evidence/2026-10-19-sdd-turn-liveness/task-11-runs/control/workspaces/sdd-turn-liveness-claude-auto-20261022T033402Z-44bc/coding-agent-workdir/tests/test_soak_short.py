"""Soak: the sliding window holds its limit under the real clock (about four minutes)."""

import time
import unittest

from ratelimit.window import SlidingWindowLimiter

SOAK_SECONDS = 240
LIMIT = 5
WINDOW = 2.0
SLACK = 0.01


class SlidingWindowSoak(unittest.TestCase):
    def test_limit_holds_in_every_trailing_window(self):
        limiter = SlidingWindowLimiter(limit=LIMIT, window_seconds=WINDOW)
        allowed = []
        start = time.monotonic()
        while time.monotonic() - start < SOAK_SECONDS:
            if limiter.allow():
                allowed.append(time.monotonic())
            time.sleep(0.05)
        self.assertGreaterEqual(len(allowed), int(SOAK_SECONDS / WINDOW * LIMIT * 0.8))
        first = 0
        for i, stamp in enumerate(allowed):
            while allowed[first] <= stamp - (WINDOW - SLACK):
                first += 1
            self.assertLessEqual(i - first + 1, LIMIT)


if __name__ == "__main__":
    unittest.main()
