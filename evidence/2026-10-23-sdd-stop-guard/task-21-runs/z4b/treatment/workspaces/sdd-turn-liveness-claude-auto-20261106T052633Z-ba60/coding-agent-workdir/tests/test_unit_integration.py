"""Integration: Registry with sliding-window limiters across many keys, on a fake clock."""

import unittest

from ratelimit.clock import FakeClock
from ratelimit.registry import Registry
from ratelimit.window import SlidingWindowLimiter

KEYS = [f"tenant-{n}" for n in range(50)]
LIMIT = 3
WINDOW = 1.5
STEP = 0.25
STEPS = 120


class RegistryWindowIntegrationTest(unittest.TestCase):
    def test_each_key_holds_its_limit_independently(self):
        clock = FakeClock()
        registry = Registry(lambda: SlidingWindowLimiter(limit=LIMIT, window_seconds=WINDOW, clock=clock))
        allowed = {key: [] for key in KEYS}
        for _ in range(STEPS):
            for key in KEYS:
                if registry.allow(key):
                    allowed[key].append(clock.now())
            clock.advance(STEP)
        self.assertEqual(registry.keys(), KEYS)
        expected = allowed[KEYS[0]]
        self.assertEqual(len(expected), STEPS * STEP / WINDOW * LIMIT)
        for key, stamps in allowed.items():
            self.assertEqual(stamps, expected, key)
            first = 0
            for i, stamp in enumerate(stamps):
                while stamps[first] <= stamp - WINDOW:
                    first += 1
                self.assertLessEqual(i - first + 1, LIMIT, key)


if __name__ == "__main__":
    unittest.main()
