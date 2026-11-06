"""Soak: the registry keeps every key's limit under the real clock (about twelve minutes)."""

import time
import unittest

from ratelimit.registry import Registry
from ratelimit.window import SlidingWindowLimiter

SOAK_SECONDS = 720
KEYS = [f"tenant-{n}" for n in range(8)]
LIMIT = 3
WINDOW = 1.5
SLACK = 0.01


class RegistrySoak(unittest.TestCase):
    def test_each_key_holds_its_limit(self):
        registry = Registry(lambda: SlidingWindowLimiter(limit=LIMIT, window_seconds=WINDOW))
        allowed = {key: [] for key in KEYS}
        start = time.monotonic()
        while time.monotonic() - start < SOAK_SECONDS:
            for key in KEYS:
                if registry.allow(key):
                    allowed[key].append(time.monotonic())
            time.sleep(0.05)
        self.assertEqual(sorted(registry.keys()), sorted(KEYS))
        for key, stamps in allowed.items():
            self.assertGreaterEqual(len(stamps), int(SOAK_SECONDS / WINDOW * LIMIT * 0.8), key)
            first = 0
            for i, stamp in enumerate(stamps):
                while stamps[first] <= stamp - (WINDOW - SLACK):
                    first += 1
                self.assertLessEqual(i - first + 1, LIMIT, key)


if __name__ == "__main__":
    unittest.main()
