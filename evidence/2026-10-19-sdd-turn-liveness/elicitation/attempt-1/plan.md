# ratelimit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `design.md`

**Goal:** Build `ratelimit`, a standard-library-only Python package with a token bucket, a sliding-window limiter, a per-key registry, and a `simulate` CLI, and pass the two existing soak tests.

**Architecture:** One module per component under `ratelimit/`. Every limiter takes an optional `clock` object with a `now() -> float` method; `None` means `MonotonicClock()`. Unit tests inject `FakeClock` so they run in milliseconds; the two soak tests already in `tests/` cover the real clock.

**Tech Stack:** Python 3.9+ standard library only (`time`, `collections.deque`, `argparse`, `unittest`).

## Global Constraints

- Standard library only. No third-party imports anywhere, including tests.
- Python 3.9 or later. The dev machine runs Python 3.15, so avoid syntax newer than 3.9: no `match`, no `X | Y` type unions (use `typing.Optional`), no parenthesized context managers. `list[str]` in annotations is fine (3.9).
- `clock=None` means `MonotonicClock()`.
- Unit tests live in `tests/test_unit_<component>.py`, use `FakeClock`, and run with `python3 -m unittest discover -s tests -p "test_unit_*.py"`.
- `tests/test_soak_short.py` and `tests/test_soak_long.py` must not be modified.
- CLI output format is exactly `allowed=<a> denied=<d>`.
- Use explicit paths with `git add`, never `git add -A` or `git add .`. End each commit message with the attribution trailer your session requires.

## Running the soak tests

The soak tests run against the real clock and cannot be shortened. Plan the turn around them:

- `python3 -m unittest tests.test_soak_short -v` takes about 4 minutes (240 s of soak). Run it in the foreground with an explicit Bash timeout of 600000 ms. The default 120000 ms timeout kills it partway through.
- `python3 -m unittest tests.test_soak_long -v` takes about 12 minutes (720 s of soak). That is longer than the 600000 ms foreground maximum, so a single foreground call cannot hold it. Launch it in the background writing to a log and an exit-code file, then wait for the exit-code file in the foreground (Task 6, Steps 5 and 6 give the exact commands). Do not end your turn or send your report while the soak is still running: a report written before the exit-code file exists has no test evidence.
- Each soak runs once per task, by the implementer, after the unit tests pass. The implementer pastes the final lines of output (the `Ran 1 test` line and `OK` or the failure) into the task report. Reviewers read that evidence and do not re-run the soak unless the code under test changed after it ran.
- Soak logs go to `/tmp/ratelimit-soak/`, outside the repository, so they never show up in `git status`.

## Grounding

- Module and class names: `tests/test_soak_short.py:6` imports `from ratelimit.window import SlidingWindowLimiter`; `tests/test_soak_long.py:6-7` imports `from ratelimit.registry import Registry`. These fix the package layout.
- Constructor keywords: `tests/test_soak_short.py:16` calls `SlidingWindowLimiter(limit=LIMIT, window_seconds=WINDOW)` with no clock, so the default clock must be the real one.
- Registry usage: `tests/test_soak_long.py:18` passes a zero-argument lambda as the factory; `:23` calls `registry.allow(key)`; `:26` compares `sorted(registry.keys())` to the key list.
- Sliding-window semantics the soak checks: `tests/test_soak_short.py:24-28` counts allowed calls in each trailing window of `WINDOW - SLACK` seconds and requires at most `LIMIT`; `:23` also requires at least 80% of the theoretical maximum allowed, so the limiter must not under-admit.
- Test shape: `tests/test_soak_short.py:1-32`: module docstring, module-level constants, one `unittest.TestCase` subclass, `if __name__ == "__main__": unittest.main()` at the bottom. Unit tests follow the same shape.
- Source naming and module layout: none: no existing source code in the repository. Follow PEP 8 and the names in `design.md`.
- Error handling: none: no existing pattern, and `design.md` specifies no argument validation. Do not add validation the spec does not ask for.
- CLI pattern: none: no existing `argparse` or `__main__` code in the repository.

## Design decisions the spec leaves open

These are settled here so every task uses the same answer:

- The sliding window is half-open: a call at time `t` counts against `(now - window_seconds, now]`. A timestamp `t` is dropped when `t <= now - window_seconds`, so a call exactly `window_seconds` after an earlier one does not see it. Denied calls are not recorded.
- `TokenBucket` starts full (`capacity` tokens) and refills continuously at `rate_per_second`, capped at `capacity`. `tokens()` returns the refilled balance as a float.
- `FakeClock(start: float = 0.0)` starts at `0.0` unless given a start time.
- `Registry.keys()` returns keys in first-use order as a new list.
- `simulate` calls `allow()` and then advances the fake clock by 0.1 s, once per call, so the first call happens at `t = 0.0`.

## File Structure

| Path | Responsibility | Task |
|---|---|---|
| `.gitignore` | ignore `__pycache__/` | 1 |
| `ratelimit/__init__.py` | package marker with one-line docstring | 1 |
| `ratelimit/clock.py` | `MonotonicClock`, `FakeClock` | 1 |
| `ratelimit/bucket.py` | `TokenBucket` | 2 |
| `ratelimit/window.py` | `SlidingWindowLimiter` | 3 |
| `ratelimit/registry.py` | `Registry` | 4 |
| `ratelimit/__main__.py` | `simulate` CLI, `main(argv)` | 5 |
| `tests/test_unit_clock.py` | clock unit tests | 1 |
| `tests/test_unit_bucket.py` | token bucket unit tests | 2 |
| `tests/test_unit_window.py` | sliding window unit tests | 3 |
| `tests/test_unit_registry.py` | registry unit tests | 4 |
| `tests/test_unit_main.py` | CLI unit tests | 5 |
| `tests/test_unit_integration.py` | registry + sliding window across many keys on a shared `FakeClock` | 6 |

Task order: 1 → 2, 3, 4 (independent of each other, all need Task 1) → 5 (needs 3) → 6 (needs 3 and 4).

---

### Task 1: Package skeleton and clocks

**Risk tier:** standard — creates the package and the clock interface every later task depends on, across four files.

**Files:**
- Create: `.gitignore`
- Create: `ratelimit/__init__.py`
- Create: `ratelimit/clock.py`
- Test: `tests/test_unit_clock.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ratelimit.clock.MonotonicClock()` with `now() -> float` (returns `time.monotonic()`).
  - `ratelimit.clock.FakeClock(start: float = 0.0)` with `now() -> float` and `advance(seconds: float) -> None`.
  - Any object with `now() -> float` is a valid clock for later tasks.

**Mirror:** `tests/test_soak_short.py:1-32`, test module shape.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_clock.py`:

```python
"""Unit tests for ratelimit.clock."""

import time
import unittest

from ratelimit.clock import FakeClock, MonotonicClock


class MonotonicClockTest(unittest.TestCase):
    def test_now_tracks_time_monotonic(self):
        clock = MonotonicClock()
        before = time.monotonic()
        reading = clock.now()
        after = time.monotonic()
        self.assertLessEqual(before, reading)
        self.assertLessEqual(reading, after)

    def test_now_never_decreases(self):
        clock = MonotonicClock()
        first = clock.now()
        second = clock.now()
        self.assertLessEqual(first, second)


class FakeClockTest(unittest.TestCase):
    def test_starts_at_zero_by_default(self):
        self.assertEqual(FakeClock().now(), 0.0)

    def test_starts_at_given_time(self):
        self.assertEqual(FakeClock(start=5.0).now(), 5.0)

    def test_advance_moves_now_forward(self):
        clock = FakeClock()
        clock.advance(1.5)
        clock.advance(0.25)
        self.assertEqual(clock.now(), 1.75)

    def test_now_does_not_move_without_advance(self):
        clock = FakeClock()
        self.assertEqual(clock.now(), clock.now())


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_clock.py" -v`
Expected: ERROR with `ModuleNotFoundError: No module named 'ratelimit'`.

- [ ] **Step 3: Write minimal implementation**

Create `.gitignore`:

```
__pycache__/
```

Create `ratelimit/__init__.py`:

```python
"""ratelimit: an in-process rate limiter."""
```

Create `ratelimit/clock.py`:

```python
"""Clocks: the real monotonic clock and a fake one for tests."""

import time


class MonotonicClock:
    """Reads time.monotonic()."""

    def now(self) -> float:
        return time.monotonic()


class FakeClock:
    """A clock that only moves when advance() is called."""

    def __init__(self, start: float = 0.0):
        self._now = start

    def now(self) -> float:
        return self._now

    def advance(self, seconds: float) -> None:
        self._now += seconds
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest discover -s tests -p "test_unit_clock.py" -v`
Expected: 6 tests, `OK`.

- [ ] **Step 5: Commit**

```bash
git add .gitignore ratelimit/__init__.py ratelimit/clock.py tests/test_unit_clock.py
git commit -m "feat: add ratelimit package with monotonic and fake clocks"
```

---

### Task 2: TokenBucket

**Risk tier:** standard — new component with refill arithmetic and its own tests.

**Files:**
- Create: `ratelimit/bucket.py`
- Test: `tests/test_unit_bucket.py`

**Interfaces:**
- Consumes: `ratelimit.clock.MonotonicClock`, `ratelimit.clock.FakeClock` (Task 1).
- Produces: `ratelimit.bucket.TokenBucket(rate_per_second: float, capacity: int, clock=None)` with `allow() -> bool` and `tokens() -> float`. No later task uses it.

**Mirror:** `tests/test_soak_short.py:1-32`, test module shape.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_bucket.py`. The time steps are binary-exact (0.5, 0.25) so float equality is safe.

```python
"""Unit tests for ratelimit.bucket."""

import unittest

from ratelimit.bucket import TokenBucket
from ratelimit.clock import FakeClock, MonotonicClock


class TokenBucketTest(unittest.TestCase):
    def test_starts_full(self):
        bucket = TokenBucket(rate_per_second=2.0, capacity=3, clock=FakeClock())
        self.assertEqual(bucket.tokens(), 3.0)

    def test_allows_up_to_capacity_then_denies(self):
        bucket = TokenBucket(rate_per_second=2.0, capacity=3, clock=FakeClock())
        self.assertEqual([bucket.allow() for _ in range(4)], [True, True, True, False])
        self.assertEqual(bucket.tokens(), 0.0)

    def test_refills_at_rate(self):
        clock = FakeClock()
        bucket = TokenBucket(rate_per_second=2.0, capacity=3, clock=clock)
        for _ in range(3):
            bucket.allow()
        clock.advance(0.25)
        self.assertEqual(bucket.tokens(), 0.5)
        self.assertFalse(bucket.allow())
        clock.advance(0.25)
        self.assertEqual(bucket.tokens(), 1.0)
        self.assertTrue(bucket.allow())
        self.assertFalse(bucket.allow())

    def test_refill_is_capped_at_capacity(self):
        clock = FakeClock()
        bucket = TokenBucket(rate_per_second=2.0, capacity=3, clock=clock)
        bucket.allow()
        clock.advance(100.0)
        self.assertEqual(bucket.tokens(), 3.0)

    def test_denied_call_does_not_spend(self):
        clock = FakeClock()
        bucket = TokenBucket(rate_per_second=1.0, capacity=1, clock=clock)
        self.assertTrue(bucket.allow())
        self.assertFalse(bucket.allow())
        clock.advance(0.5)
        self.assertEqual(bucket.tokens(), 0.5)

    def test_default_clock_is_monotonic(self):
        bucket = TokenBucket(rate_per_second=1.0, capacity=1)
        self.assertIsInstance(bucket._clock, MonotonicClock)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_bucket.py" -v`
Expected: ERROR with `ModuleNotFoundError: No module named 'ratelimit.bucket'`.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/bucket.py`:

```python
"""Token bucket limiter."""

from ratelimit.clock import MonotonicClock


class TokenBucket:
    """Holds up to `capacity` tokens, refilled at `rate_per_second`.

    Starts full. Each allowed call spends one token.
    """

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

    def tokens(self) -> float:
        self._refill()
        return self._tokens

    def allow(self) -> bool:
        self._refill()
        if self._tokens >= 1.0:
            self._tokens -= 1.0
            return True
        return False
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest discover -s tests -p "test_unit_bucket.py" -v`
Expected: 6 tests, `OK`.

- [ ] **Step 5: Commit**

```bash
git add ratelimit/bucket.py tests/test_unit_bucket.py
git commit -m "feat: add TokenBucket limiter"
```

---

### Task 3: SlidingWindowLimiter

**Risk tier:** standard — new component whose correctness the short soak checks under the real clock.

**Files:**
- Create: `ratelimit/window.py`
- Test: `tests/test_unit_window.py`
- Covering command (existing, do not modify): `tests/test_soak_short.py`

**Interfaces:**
- Consumes: `ratelimit.clock.MonotonicClock`, `ratelimit.clock.FakeClock` (Task 1).
- Produces: `ratelimit.window.SlidingWindowLimiter(limit: int, window_seconds: float, clock=None)` with `allow() -> bool`. Tasks 5 and 6 construct it by keyword: `SlidingWindowLimiter(limit=..., window_seconds=..., clock=...)`.

**Mirror:** `tests/test_soak_short.py:1-32`, test module shape.

The limiter keeps a `collections.deque` of allowed-call timestamps. On each `allow()` it drops timestamps `t <= now - window_seconds` from the left, then allows (and appends `now`) only if fewer than `limit` remain. Each timestamp is appended and removed once, so `allow()` is amortized O(1) and memory is at most `limit` timestamps.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_window.py`:

```python
"""Unit tests for ratelimit.window."""

import unittest

from ratelimit.clock import FakeClock, MonotonicClock
from ratelimit.window import SlidingWindowLimiter


class SlidingWindowLimiterTest(unittest.TestCase):
    def test_allows_up_to_limit_at_one_instant(self):
        limiter = SlidingWindowLimiter(limit=3, window_seconds=1.0, clock=FakeClock())
        self.assertEqual([limiter.allow() for _ in range(4)], [True, True, True, False])

    def test_call_expires_exactly_one_window_later(self):
        clock = FakeClock()
        limiter = SlidingWindowLimiter(limit=1, window_seconds=1.0, clock=clock)
        self.assertTrue(limiter.allow())
        clock.advance(0.5)
        self.assertFalse(limiter.allow())
        clock.advance(0.5)
        self.assertTrue(limiter.allow())

    def test_calls_expire_one_at_a_time(self):
        clock = FakeClock()
        limiter = SlidingWindowLimiter(limit=2, window_seconds=1.0, clock=clock)
        self.assertTrue(limiter.allow())   # t=0.0
        clock.advance(0.5)
        self.assertTrue(limiter.allow())   # t=0.5
        self.assertFalse(limiter.allow())  # t=0.5, window holds 0.0 and 0.5
        clock.advance(0.5)
        self.assertTrue(limiter.allow())   # t=1.0, 0.0 has expired
        self.assertFalse(limiter.allow())  # t=1.0, window holds 0.5 and 1.0
        clock.advance(0.5)
        self.assertTrue(limiter.allow())   # t=1.5, 0.5 has expired

    def test_denied_calls_are_not_counted(self):
        clock = FakeClock()
        limiter = SlidingWindowLimiter(limit=1, window_seconds=1.0, clock=clock)
        self.assertTrue(limiter.allow())   # t=0.0
        clock.advance(0.75)
        self.assertFalse(limiter.allow())  # t=0.75, denied, must not be recorded
        clock.advance(0.25)
        self.assertTrue(limiter.allow())   # t=1.0, only 0.0 was recorded and it expired

    def test_long_idle_resets_fully(self):
        clock = FakeClock()
        limiter = SlidingWindowLimiter(limit=2, window_seconds=1.0, clock=clock)
        limiter.allow()
        limiter.allow()
        clock.advance(10.0)
        self.assertEqual([limiter.allow() for _ in range(3)], [True, True, False])

    def test_default_clock_is_monotonic(self):
        limiter = SlidingWindowLimiter(limit=1, window_seconds=1.0)
        self.assertIsInstance(limiter._clock, MonotonicClock)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_window.py" -v`
Expected: ERROR with `ModuleNotFoundError: No module named 'ratelimit.window'`.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/window.py`:

```python
"""Sliding window limiter."""

from collections import deque

from ratelimit.clock import MonotonicClock


class SlidingWindowLimiter:
    """Allows at most `limit` calls in any trailing window of `window_seconds`.

    The window is (now - window_seconds, now]. Denied calls are not recorded.
    """

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

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `python3 -m unittest discover -s tests -p "test_unit_window.py" -v`
Expected: 6 tests, `OK`.

- [ ] **Step 5: Run the covering soak (about 4 minutes)**

Run in the foreground with a Bash timeout of 600000 ms (see "Running the soak tests"):

```bash
python3 -m unittest tests.test_soak_short -v
```

Expected, after about 240 s: `test_limit_holds_in_every_trailing_window ... ok`, `Ran 1 test`, `OK`. Paste those lines into the task report. If it fails, stop and use hyperpowers:systematic-debugging; do not edit the soak test.

- [ ] **Step 6: Commit**

```bash
git add ratelimit/window.py tests/test_unit_window.py
git commit -m "feat: add SlidingWindowLimiter"
```

---

### Task 4: Registry

**Risk tier:** standard — new component that Task 6 integrates; small, but its first-use and ordering behavior is what the long soak relies on.

**Files:**
- Create: `ratelimit/registry.py`
- Test: `tests/test_unit_registry.py`

**Interfaces:**
- Consumes: nothing from earlier tasks at runtime. The tests use a stub limiter so this task does not depend on Task 3.
- Produces: `ratelimit.registry.Registry(factory)` where `factory` is a zero-argument callable returning an object with `allow() -> bool`. Methods: `get(key: str)` returns the key's limiter, creating it on first use; `allow(key: str) -> bool` delegates to `get(key).allow()`; `keys() -> list[str]` returns keys in first-use order as a new list.

**Mirror:** `tests/test_soak_short.py:1-32`, test module shape. Usage to satisfy: `tests/test_soak_long.py:18-26`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_registry.py`:

```python
"""Unit tests for ratelimit.registry."""

import unittest

from ratelimit.registry import Registry


class StubLimiter:
    """Allows the first `budget` calls, then denies."""

    def __init__(self, budget):
        self.budget = budget
        self.calls = 0

    def allow(self):
        self.calls += 1
        return self.calls <= self.budget


class RegistryTest(unittest.TestCase):
    def setUp(self):
        self.created = []

        def factory():
            limiter = StubLimiter(budget=2)
            self.created.append(limiter)
            return limiter

        self.registry = Registry(factory)

    def test_get_creates_once_per_key(self):
        first = self.registry.get("a")
        again = self.registry.get("a")
        self.assertIs(first, again)
        self.assertEqual(len(self.created), 1)

    def test_distinct_keys_get_distinct_limiters(self):
        self.assertIsNot(self.registry.get("a"), self.registry.get("b"))
        self.assertEqual(len(self.created), 2)

    def test_allow_delegates_to_the_keys_limiter(self):
        self.assertEqual([self.registry.allow("a") for _ in range(3)], [True, True, False])
        self.assertTrue(self.registry.allow("b"))
        self.assertEqual(self.registry.get("a").calls, 3)
        self.assertEqual(self.registry.get("b").calls, 1)

    def test_keys_lists_seen_keys_in_first_use_order(self):
        self.registry.allow("b")
        self.registry.get("a")
        self.registry.allow("b")
        self.assertEqual(self.registry.keys(), ["b", "a"])

    def test_keys_is_empty_before_use(self):
        self.assertEqual(self.registry.keys(), [])

    def test_keys_returns_a_copy(self):
        self.registry.get("a")
        self.registry.keys().append("z")
        self.assertEqual(self.registry.keys(), ["a"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_registry.py" -v`
Expected: ERROR with `ModuleNotFoundError: No module named 'ratelimit.registry'`.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/registry.py`. Python dicts keep insertion order (guaranteed since 3.7), which gives first-use order.

```python
"""Per-key limiter registry."""


class Registry:
    """Keeps one limiter per key, created by calling `factory()` on first use."""

    def __init__(self, factory):
        self._factory = factory
        self._limiters = {}

    def get(self, key: str):
        limiter = self._limiters.get(key)
        if limiter is None:
            limiter = self._factory()
            self._limiters[key] = limiter
        return limiter

    def allow(self, key: str) -> bool:
        return self.get(key).allow()

    def keys(self) -> list[str]:
        return list(self._limiters)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest discover -s tests -p "test_unit_registry.py" -v`
Expected: 6 tests, `OK`.

- [ ] **Step 5: Commit**

```bash
git add ratelimit/registry.py tests/test_unit_registry.py
git commit -m "feat: add per-key Registry"
```

---

### Task 5: `simulate` CLI

**Risk tier:** standard — new entry point with argument parsing and a fixed output format.

**Files:**
- Create: `ratelimit/__main__.py`
- Test: `tests/test_unit_main.py`

**Interfaces:**
- Consumes: `ratelimit.clock.FakeClock` (Task 1), `ratelimit.window.SlidingWindowLimiter(limit=..., window_seconds=..., clock=...)` (Task 3).
- Produces: `ratelimit.__main__.main(argv=None) -> int` (returns 0 on success; `argparse` exits with status 2 on bad arguments) and the command `python3 -m ratelimit simulate --limit N --window S --calls C`, printing `allowed=<a> denied=<d>`.

**Mirror:** `tests/test_soak_short.py:1-32`, test module shape. No existing CLI code to imitate.

The expected counts below were computed by running the same loop in a scratch script: `limit=5, window=1.05, calls=20` gives `allowed=10 denied=10`; `limit=3, window=10, calls=7` gives `allowed=3 denied=4`; `limit=2, window=0.35, calls=10` gives `allowed=6 denied=4`. The window values sit 0.05 s away from any multiple of 0.1, so float drift from repeated `advance(0.1)` cannot flip a result.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_main.py`:

```python
"""Unit tests for the ratelimit command line."""

import contextlib
import io
import os
import subprocess
import sys
import unittest

from ratelimit.__main__ import main

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run_main(argv):
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = main(argv)
    return code, out.getvalue()


class SimulateTest(unittest.TestCase):
    def test_window_refills_partway(self):
        code, out = run_main(["simulate", "--limit", "5", "--window", "1.05", "--calls", "20"])
        self.assertEqual(code, 0)
        self.assertEqual(out, "allowed=10 denied=10\n")

    def test_window_longer_than_run(self):
        code, out = run_main(["simulate", "--limit", "3", "--window", "10", "--calls", "7"])
        self.assertEqual(code, 0)
        self.assertEqual(out, "allowed=3 denied=4\n")

    def test_short_window_admits_repeatedly(self):
        code, out = run_main(["simulate", "--limit", "2", "--window", "0.35", "--calls", "10"])
        self.assertEqual(code, 0)
        self.assertEqual(out, "allowed=6 denied=4\n")

    def test_zero_calls(self):
        code, out = run_main(["simulate", "--limit", "1", "--window", "1", "--calls", "0"])
        self.assertEqual(code, 0)
        self.assertEqual(out, "allowed=0 denied=0\n")

    def test_missing_argument_exits_2(self):
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as caught:
                main(["simulate", "--limit", "1", "--window", "1"])
        self.assertEqual(caught.exception.code, 2)

    def test_runs_as_module(self):
        result = subprocess.run(
            [sys.executable, "-m", "ratelimit", "simulate",
             "--limit", "5", "--window", "1.05", "--calls", "20"],
            cwd=REPO_ROOT, capture_output=True, text=True, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "allowed=10 denied=10\n")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_main.py" -v`
Expected: ERROR with `ModuleNotFoundError: No module named 'ratelimit.__main__'`.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/__main__.py`:

```python
"""Command line: python3 -m ratelimit simulate --limit N --window S --calls C."""

import argparse
import sys

from ratelimit.clock import FakeClock
from ratelimit.window import SlidingWindowLimiter

STEP_SECONDS = 0.1


def simulate(limit: int, window: float, calls: int) -> str:
    clock = FakeClock()
    limiter = SlidingWindowLimiter(limit=limit, window_seconds=window, clock=clock)
    allowed = 0
    for _ in range(calls):
        if limiter.allow():
            allowed += 1
        clock.advance(STEP_SECONDS)
    return f"allowed={allowed} denied={calls - allowed}"


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="python3 -m ratelimit")
    commands = parser.add_subparsers(dest="command", required=True)
    sim = commands.add_parser("simulate", help="drive a sliding window with a fake clock")
    sim.add_argument("--limit", type=int, required=True)
    sim.add_argument("--window", type=float, required=True)
    sim.add_argument("--calls", type=int, required=True)
    args = parser.parse_args(argv)
    print(simulate(args.limit, args.window, args.calls))
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest discover -s tests -p "test_unit_main.py" -v`
Expected: 6 tests, `OK`.

- [ ] **Step 5: Commit**

```bash
git add ratelimit/__main__.py tests/test_unit_main.py
git commit -m "feat: add simulate command line"
```

---

### Task 6: Integration: registry with sliding windows across many keys

**Risk tier:** standard — integration across Tasks 3 and 4, verified by a 12-minute real-clock soak.

**Files:**
- Test: `tests/test_unit_integration.py`
- Covering command (existing, do not modify): `tests/test_soak_long.py`
- Modify only if a test here fails: `ratelimit/window.py` or `ratelimit/registry.py`

**Interfaces:**
- Consumes: `Registry(factory)` with `allow(key)`, `keys()` (Task 4); `SlidingWindowLimiter(limit=..., window_seconds=..., clock=...)` (Task 3); `FakeClock` (Task 1).
- Produces: nothing new. This task proves the components work together.

**Mirror:** `tests/test_soak_long.py:16-33`, the same registry-with-sliding-window setup, here on a `FakeClock`.

No new production code is expected: Tasks 3 and 4 should already satisfy this test, so Step 2 expects a pass, not a failure. If either the unit test or the soak fails, that is a bug in Task 3 or 4: use hyperpowers:systematic-debugging, fix the production module, and add the reproducing case to that module's unit test file.

- [ ] **Step 1: Write the integration test**

Create `tests/test_unit_integration.py`:

```python
"""Integration: one Registry of SlidingWindowLimiters sharing a FakeClock."""

import unittest

from ratelimit.clock import FakeClock
from ratelimit.registry import Registry
from ratelimit.window import SlidingWindowLimiter

KEYS = [f"tenant-{n}" for n in range(50)]
LIMIT = 3
WINDOW = 1.5


class RegistryWindowIntegrationTest(unittest.TestCase):
    def setUp(self):
        self.clock = FakeClock()
        self.registry = Registry(
            lambda: SlidingWindowLimiter(limit=LIMIT, window_seconds=WINDOW, clock=self.clock)
        )

    def test_every_key_gets_its_own_limit(self):
        for key in KEYS:
            results = [self.registry.allow(key) for _ in range(LIMIT + 1)]
            self.assertEqual(results, [True] * LIMIT + [False], key)
        self.assertEqual(self.registry.keys(), KEYS)

    def test_one_busy_key_does_not_affect_others(self):
        for _ in range(10):
            self.registry.allow("tenant-0")
        self.assertTrue(self.registry.allow("tenant-1"))

    def test_all_keys_recover_after_one_window(self):
        for key in KEYS:
            for _ in range(LIMIT):
                self.registry.allow(key)
        self.clock.advance(1.0)
        self.assertFalse(any(self.registry.allow(key) for key in KEYS))
        self.clock.advance(0.5)
        self.assertTrue(all(self.registry.allow(key) for key in KEYS))

    def test_limit_holds_in_every_trailing_window(self):
        allowed = {key: [] for key in KEYS}
        for _ in range(180):  # 45 s: exactly 30 windows of 1.5 s
            for key in KEYS:
                if self.registry.allow(key):
                    allowed[key].append(self.clock.now())
            self.clock.advance(0.25)
        for key, stamps in allowed.items():
            self.assertEqual(len(stamps), 30 * LIMIT, key)
            for i, stamp in enumerate(stamps):
                in_window = [s for s in stamps[: i + 1] if s > stamp - WINDOW]
                self.assertLessEqual(len(in_window), LIMIT, key)


if __name__ == "__main__":
    unittest.main()
```

In `test_limit_holds_in_every_trailing_window`, each key admits a burst of 3 calls at the start of every 1.5 s window (t = 0.0, 0.25, 0.5, then 1.5, 1.75, 2.0, and so on). 180 steps of 0.25 s cover 45 s, exactly 30 windows, so each key is allowed 90 calls. Steps of 0.25 s are binary-exact, so the counts do not drift.

- [ ] **Step 2: Run the integration test**

Run: `python3 -m unittest discover -s tests -p "test_unit_integration.py" -v`
Expected: 4 tests, `OK`. If it fails, follow the debugging note above before going on.

- [ ] **Step 3: Run the full unit suite**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py" -v`
Expected: 34 tests (6 + 6 + 6 + 6 + 6 + 4), `OK`. The soak tests do not match `test_unit_*` and are not collected.

- [ ] **Step 4: Check Python 3.9 syntax compatibility**

Run:

```bash
python3 -I -c 'import ast, pathlib; [ast.parse(p.read_text(), str(p), feature_version=(3, 9)) for p in sorted(pathlib.Path("ratelimit").glob("*.py")) + sorted(pathlib.Path("tests").glob("test_unit_*.py"))]; print("3.9 syntax ok")'
```

Expected: `3.9 syntax ok`. This catches syntax newer than 3.9 (`match`, parenthesized context managers). It does not catch `X | Y` unions in annotations, so also run `grep -n " | " ratelimit/*.py` and expect no annotation hits.

- [ ] **Step 5: Launch the covering soak in the background (about 12 minutes)**

Run with Bash `run_in_background: true` and a timeout of 1200000 ms:

```bash
mkdir -p /tmp/ratelimit-soak && rm -f /tmp/ratelimit-soak/long.exit && \
python3 -m unittest tests.test_soak_long -v > /tmp/ratelimit-soak/long.log 2>&1; \
echo $? > /tmp/ratelimit-soak/long.exit
```

- [ ] **Step 6: Wait in the foreground for the soak to finish**

Run in the foreground with a Bash timeout of 600000 ms:

```bash
for _ in $(seq 1 57); do [ -f /tmp/ratelimit-soak/long.exit ] && break; sleep 10; done; \
if [ -f /tmp/ratelimit-soak/long.exit ]; then echo "exit=$(cat /tmp/ratelimit-soak/long.exit)"; tail -n 5 /tmp/ratelimit-soak/long.log; else echo "still running"; fi
```

The loop stops at 570 s, under the 600 s timeout. If it prints `still running`, run the same command again; the soak needs about 720 s in total, so expect two calls. Do not end the turn, write the report, or commit while it prints `still running`.

Expected: `exit=0`, and the log tail shows `test_each_key_holds_its_limit ... ok`, `Ran 1 test`, `OK`. Paste the tail into the task report. A non-zero exit means a bug in Task 3 or 4; debug as described above, then re-run Steps 2 through 6.

- [ ] **Step 7: Commit**

```bash
git add tests/test_unit_integration.py
git commit -m "test: add registry and sliding window integration test"
```

If Step 2 or Step 6 required a production fix, add the changed `ratelimit/` file and its unit test file to the same `git add`.
