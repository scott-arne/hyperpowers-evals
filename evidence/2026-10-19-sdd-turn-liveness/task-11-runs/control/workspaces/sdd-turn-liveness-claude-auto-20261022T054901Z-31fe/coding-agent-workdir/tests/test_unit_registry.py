"""Unit tests for ratelimit.registry."""

import unittest

from ratelimit.clock import FakeClock
from ratelimit.registry import Registry
from ratelimit.window import SlidingWindowLimiter


class RegistryTest(unittest.TestCase):
    def setUp(self):
        self.clock = FakeClock()
        self.calls = 0

        def factory():
            self.calls += 1
            return SlidingWindowLimiter(limit=1, window_seconds=1.0, clock=self.clock)

        self.registry = Registry(factory)

    def test_get_creates_limiter_once_per_key(self):
        first = self.registry.get("a")
        self.assertIs(self.registry.get("a"), first)
        self.assertEqual(self.calls, 1)

    def test_keys_start_empty(self):
        self.assertEqual(self.registry.keys(), [])

    def test_keys_lists_keys_in_first_use_order(self):
        self.registry.allow("b")
        self.registry.get("a")
        self.registry.allow("b")
        self.assertEqual(self.registry.keys(), ["b", "a"])

    def test_allow_delegates_to_the_keys_limiter(self):
        self.assertTrue(self.registry.allow("a"))
        self.assertFalse(self.registry.allow("a"))
        self.assertFalse(self.registry.get("a").allow())

    def test_keys_are_limited_independently(self):
        self.assertTrue(self.registry.allow("a"))
        self.assertTrue(self.registry.allow("b"))
        self.assertFalse(self.registry.allow("a"))
        self.clock.advance(1.0)
        self.assertTrue(self.registry.allow("a"))


if __name__ == "__main__":
    unittest.main()
