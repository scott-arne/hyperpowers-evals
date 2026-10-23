### Task 2: Token bucket

**Risk tier:** standard — new module with refill arithmetic; behaviour depends on a plan decision (bucket starts full).

**Files:**
- Create: `ratelimit/bucket.py`
- Test: `tests/test_unit_bucket.py`

**Interfaces:**
- Consumes: `MonotonicClock`, `FakeClock` from `ratelimit/clock.py` (Task 1).
- Produces: `TokenBucket(rate_per_second: float, capacity: int, clock=None)` with `allow() -> bool` and `tokens() -> float`.

**Mirror:** `tests/test_soak_short.py:1-32`, test module shape.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_bucket.py`. Time steps are powers of two so the float arithmetic is exact.

```python
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

    def test_default_clock_is_monotonic(self):
        bucket = TokenBucket(rate_per_second=1.0, capacity=1)
        self.assertIsInstance(bucket._clock, MonotonicClock)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py"` (under 5 seconds)
Expected: FAIL with `ModuleNotFoundError: No module named 'ratelimit.bucket'`.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/bucket.py`:

```python
"""Token bucket: refills continuously, spends one token per allowed call."""

from ratelimit.clock import MonotonicClock


class TokenBucket:
    def __init__(self, rate_per_second: float, capacity: int, clock=None):
        self._rate = rate_per_second
        self._capacity = capacity
        self._clock = clock if clock is not None else MonotonicClock()
        self._tokens = float(capacity)
        self._last = self._clock.now()

    def _refill(self) -> None:
        now = self._clock.now()
        self._tokens = min(self._capacity, self._tokens + (now - self._last) * self._rate)
        self._last = now

    def allow(self) -> bool:
        self._refill()
        if self._tokens >= 1.0:
            self._tokens -= 1.0
            return True
        return False

    def tokens(self) -> float:
        self._refill()
        return self._tokens
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py"` (under 5 seconds)
Expected: PASS, `Ran 11 tests`, `OK`.

- [ ] **Step 5: Commit**

```bash
git add ratelimit/bucket.py tests/test_unit_bucket.py
git commit -m "feat: add token bucket limiter"
```

---

