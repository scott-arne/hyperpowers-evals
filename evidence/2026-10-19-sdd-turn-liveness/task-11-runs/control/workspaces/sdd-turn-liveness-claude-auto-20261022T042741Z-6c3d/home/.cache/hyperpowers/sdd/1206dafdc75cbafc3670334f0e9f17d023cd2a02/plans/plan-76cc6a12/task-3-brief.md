### Task 3: Sliding window limiter

**Risk tier:** standard — new module whose boundary semantics the existing soak test checks under the real clock.

**Files:**
- Create: `ratelimit/window.py`
- Test: `tests/test_unit_window.py`

**Interfaces:**
- Consumes: `MonotonicClock`, `FakeClock` from `ratelimit/clock.py` (Task 1).
- Produces: `SlidingWindowLimiter(limit: int, window_seconds: float, clock=None)` with `allow() -> bool`. Imported by `tests/test_soak_short.py`, `tests/test_soak_long.py`, Task 5, and Task 6.

**Mirror:** `tests/test_soak_short.py:1-32`, test module shape.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_window.py`. Time steps are powers of two so boundary comparisons are exact.

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py"` (under 5 seconds)
Expected: FAIL with `ModuleNotFoundError: No module named 'ratelimit.window'`.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/window.py`:

```python
"""Sliding window: at most `limit` allowed calls in any trailing window."""

from collections import deque

from ratelimit.clock import MonotonicClock


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: float, clock=None):
        self._limit = limit
        self._window = window_seconds
        self._clock = clock if clock is not None else MonotonicClock()
        self._stamps = deque()

    def allow(self) -> bool:
        now = self._clock.now()
        cutoff = now - self._window
        while self._stamps and self._stamps[0] <= cutoff:
            self._stamps.popleft()
        if len(self._stamps) < self._limit:
            self._stamps.append(now)
            return True
        return False
```

- [ ] **Step 4: Run unit tests to verify they pass**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py"` (under 5 seconds)
Expected: PASS, `Ran 16 tests`, `OK`.

- [ ] **Step 5: Run the covering soak test**

Run: `python3 -m unittest tests.test_soak_short -v` (about 4 minutes)
Expected: `test_limit_holds_in_every_trailing_window ... ok`, `Ran 1 test`, `OK`. If it fails on the 80% throughput assertion, the limiter is denying calls that have room; if it fails on the per-window count, the eviction comparison is wrong. Do not edit the soak test.

- [ ] **Step 6: Commit**

```bash
git add ratelimit/window.py tests/test_unit_window.py
git commit -m "feat: add sliding window limiter"
```

---

