"""Unit tests for ratelimit.window."""

import unittest

from ratelimit.clock import FakeClock, MonotonicClock
from ratelimit.window import SlidingWindowLimiter


class SlidingWindowLimiterTest(unittest.TestCase):
    def test_allows_up_to_limit_then_denies(self):
        limiter = SlidingWindowLimiter(limit=3, window_seconds=1.0, clock=FakeClock())
        self.assertEqual([limiter.allow() for _ in range(4)], [True, True, True, False])

    def test_stamp_exactly_one_window_old_no_longer_counts(self):
        clock = FakeClock()
        limiter = SlidingWindowLimiter(limit=1, window_seconds=1.0, clock=clock)
        self.assertTrue(limiter.allow())
        clock.advance(0.5)
        self.assertFalse(limiter.allow())
        clock.advance(0.5)
        self.assertTrue(limiter.allow())

    def test_window_slides_one_stamp_at_a_time(self):
        clock = FakeClock()
        limiter = SlidingWindowLimiter(limit=2, window_seconds=1.0, clock=clock)
        self.assertTrue(limiter.allow())  # t=0.0
        clock.advance(0.5)
        self.assertTrue(limiter.allow())  # t=0.5
        clock.advance(0.25)
        self.assertFalse(limiter.allow())  # t=0.75, two stamps in window
        clock.advance(0.25)
        self.assertTrue(limiter.allow())  # t=1.0, stamp at 0.0 dropped
        self.assertFalse(limiter.allow())  # t=1.0, stamps at 0.5 and 1.0

    def test_denied_calls_are_not_recorded(self):
        clock = FakeClock()
        limiter = SlidingWindowLimiter(limit=1, window_seconds=1.0, clock=clock)
        self.assertTrue(limiter.allow())  # t=0.0
        clock.advance(0.5)
        self.assertFalse(limiter.allow())  # t=0.5, denied
        clock.advance(0.5)
        self.assertTrue(limiter.allow())  # t=1.0, the denied call at 0.5 does not block

    def test_default_clock_is_monotonic(self):
        limiter = SlidingWindowLimiter(limit=1, window_seconds=1.0)
        self.assertIsInstance(limiter._clock, MonotonicClock)


if __name__ == "__main__":
    unittest.main()
