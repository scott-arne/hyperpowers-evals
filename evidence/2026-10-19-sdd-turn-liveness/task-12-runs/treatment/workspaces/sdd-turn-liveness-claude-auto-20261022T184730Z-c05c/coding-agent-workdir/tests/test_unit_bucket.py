"""Unit tests for ratelimit.bucket."""

import unittest

from ratelimit.bucket import TokenBucket
from ratelimit.clock import FakeClock, MonotonicClock


class TokenBucketTest(unittest.TestCase):
    def test_starts_full(self):
        bucket = TokenBucket(rate_per_second=1.0, capacity=3, clock=FakeClock())
        self.assertEqual(bucket.tokens(), 3.0)

    def test_allow_spends_one_token_until_empty(self):
        bucket = TokenBucket(rate_per_second=1.0, capacity=3, clock=FakeClock())
        self.assertEqual([bucket.allow() for _ in range(4)], [True, True, True, False])
        self.assertEqual(bucket.tokens(), 0.0)

    def test_denied_call_spends_nothing(self):
        clock = FakeClock()
        bucket = TokenBucket(rate_per_second=2.0, capacity=1, clock=clock)
        self.assertTrue(bucket.allow())
        clock.advance(0.25)
        self.assertFalse(bucket.allow())
        self.assertEqual(bucket.tokens(), 0.5)

    def test_refills_at_rate(self):
        clock = FakeClock()
        bucket = TokenBucket(rate_per_second=2.0, capacity=4, clock=clock)
        for _ in range(4):
            bucket.allow()
        clock.advance(0.5)
        self.assertEqual(bucket.tokens(), 1.0)
        self.assertTrue(bucket.allow())
        self.assertFalse(bucket.allow())

    def test_refill_is_capped_at_capacity(self):
        clock = FakeClock()
        bucket = TokenBucket(rate_per_second=10.0, capacity=2, clock=clock)
        bucket.allow()
        clock.advance(8.0)
        self.assertEqual(bucket.tokens(), 2.0)
        self.assertIsInstance(bucket.tokens(), float)

    def test_default_clock_is_monotonic(self):
        bucket = TokenBucket(rate_per_second=1.0, capacity=1)
        self.assertIsInstance(bucket._clock, MonotonicClock)


if __name__ == "__main__":
    unittest.main()
