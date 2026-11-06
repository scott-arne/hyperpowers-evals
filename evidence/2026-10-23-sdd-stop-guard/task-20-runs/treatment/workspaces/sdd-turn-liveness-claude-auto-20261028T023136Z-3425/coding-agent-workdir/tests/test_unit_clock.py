"""Unit tests for ratelimit.clock."""

import time
import unittest

from ratelimit.clock import FakeClock, MonotonicClock


class FakeClockTest(unittest.TestCase):
    def test_starts_at_zero_by_default(self):
        self.assertEqual(FakeClock().now(), 0.0)

    def test_starts_at_given_time(self):
        self.assertEqual(FakeClock(start=10.0).now(), 10.0)

    def test_advance_moves_time_forward(self):
        clock = FakeClock()
        clock.advance(1.5)
        clock.advance(0.25)
        self.assertEqual(clock.now(), 1.75)

    def test_now_does_not_move_by_itself(self):
        clock = FakeClock(start=3.0)
        self.assertEqual(clock.now(), clock.now())


class MonotonicClockTest(unittest.TestCase):
    def test_now_tracks_time_monotonic(self):
        before = time.monotonic()
        value = MonotonicClock().now()
        after = time.monotonic()
        self.assertLessEqual(before, value)
        self.assertLessEqual(value, after)


if __name__ == "__main__":
    unittest.main()
