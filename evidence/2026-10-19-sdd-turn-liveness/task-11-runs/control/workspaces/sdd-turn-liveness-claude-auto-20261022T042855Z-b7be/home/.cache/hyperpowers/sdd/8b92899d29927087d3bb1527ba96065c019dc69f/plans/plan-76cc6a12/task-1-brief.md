### Task 1: Package and clocks

**Risk tier:** standard — creates the package and the clock interface every later task imports; three new files.

**Files:**
- Create: `ratelimit/__init__.py`
- Create: `ratelimit/clock.py`
- Test: `tests/test_unit_clock.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `MonotonicClock()` with `now() -> float` (returns `time.monotonic()`).
  - `FakeClock(start: float = 0.0)` with `now() -> float` and `advance(seconds: float) -> None`.

**Mirror:** `tests/test_soak_short.py:1-32`, test module shape (docstring, single `TestCase`, `unittest.main()` guard).

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_clock.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py"` (under 5 seconds)
Expected: FAIL with `ModuleNotFoundError: No module named 'ratelimit'`.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/__init__.py`:

```python
"""ratelimit: an in-process rate limiter."""
```

Create `ratelimit/clock.py`:

```python
"""Clocks: the real monotonic clock and a manually advanced clock for tests."""

import time


class MonotonicClock:
    def now(self) -> float:
        return time.monotonic()


class FakeClock:
    def __init__(self, start: float = 0.0):
        self._now = start

    def now(self) -> float:
        return self._now

    def advance(self, seconds: float) -> None:
        self._now += seconds
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py"` (under 5 seconds)
Expected: PASS, `Ran 5 tests`, `OK`.

- [ ] **Step 5: Commit**

```bash
git add ratelimit/__init__.py ratelimit/clock.py tests/test_unit_clock.py
git commit -m "feat: add ratelimit package with monotonic and fake clocks"
```

---

