# ratelimit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `design.md`

**Goal:** Build `ratelimit`, a standard-library-only Python package with a token bucket, a sliding-window limiter, a per-key registry, and a `simulate` command line.

**Architecture:** Every limiter reads time from an injected clock object with a `now() -> float` method. Production code gets `MonotonicClock`; unit tests pass a `FakeClock` and move time by hand, so no unit test sleeps. `Registry` knows nothing about limiter types: it calls a zero-argument factory per key and forwards `allow()`.

**Tech Stack:** Python 3.9+ standard library only (`time`, `collections.deque`, `argparse`), `unittest`.

## Global Constraints

- Standard library only. No third-party imports, no `requirements.txt`, no `setup.py`/`pyproject.toml` (the design does not ask for packaging).
- Must run on Python 3.9 or later. Do not use `X | Y` union annotations, `match`, or other 3.10+ syntax. Built-in generics such as `list[str]` are allowed in 3.9 but the code below avoids them anyway.
- `clock=None` means `MonotonicClock()`.
- Unit tests live in `tests/test_unit_<component>.py`, use `FakeClock`, and run with `python3 -m unittest discover -s tests -p "test_unit_*.py"` from the repository root.
- `tests/test_soak_short.py` and `tests/test_soak_long.py` already exist and **must not be modified**.
- Soak commands take a long time. `python3 -m unittest tests.test_soak_short -v` takes about 4 minutes; `python3 -m unittest tests.test_soak_long -v` takes about 12 minutes. The 12-minute run exceeds the Bash tool's 10-minute foreground limit, so run soaks with `run_in_background: true` and wait for the completion notification rather than polling. Keep doing the task's other steps (for example, the fast unit suite) while a soak runs. Do not commit until the soak has reported its result.
- CLI output format is exactly `allowed=<a> denied=<d>` followed by a newline.

## Decisions the design leaves open

The design does not say these things. The plan picks the following, and the tests pin them down:

- **A `TokenBucket` starts full** (`tokens() == capacity`). This is the common convention and lets a fresh limiter accept a burst immediately.
- **`TokenBucket.tokens()` always returns a `float`**, including when capped at capacity.
- **Sliding-window boundary:** a call made at time `t` stops counting once `now - t >= window_seconds`. With limit 3 and window 2.0, three calls at t=0 free up at exactly t=2.0. The soak tests allow 0.01 s of slack, so either boundary convention passes them; this one is chosen and tested.
- **Denied calls do not count** toward the sliding window. Only allowed calls are recorded.
- **`Registry.keys()` returns keys in first-use order.**
- **`simulate` step order:** each call runs `allow()` and then advances the fake clock by 0.1 s, so calls land at t = 0.0, 0.1, 0.2, and so on.
- **No argument validation** beyond what `argparse` does (missing or non-numeric flags exit with status 2). The design does not ask for `ValueError` on zero or negative rates, so none is added.

## File Structure

| File | Responsibility |
|------|----------------|
| `ratelimit/__init__.py` | Marks the package. Docstring only, no re-exports (the design and soak tests import from submodules). |
| `ratelimit/clock.py` | `MonotonicClock`, `FakeClock`. |
| `ratelimit/bucket.py` | `TokenBucket`. |
| `ratelimit/window.py` | `SlidingWindowLimiter`. |
| `ratelimit/registry.py` | `Registry`. |
| `ratelimit/__main__.py` | `simulate()` function and `main(argv)` argparse entry point. |
| `tests/test_unit_clock.py` | Clock unit tests. |
| `tests/test_unit_bucket.py` | Token bucket unit tests. |
| `tests/test_unit_window.py` | Sliding window unit tests. |
| `tests/test_unit_registry.py` | Registry unit tests, plus a FakeClock integration test of registry with sliding windows across 50 keys. |
| `tests/test_unit_cli.py` | `simulate`, `main`, and `python3 -m ratelimit` tests. |

`tests/__init__.py` already exists (empty) and stays as is.

## Grounding

The repository contains only `design.md` and the two soak tests, so most conventions have no existing example.

- Test shape: `tests/test_soak_short.py:1-32` shows the house style: a one-line module docstring, `import unittest`, imports from `ratelimit.<module>`, module-level UPPER_CASE constants, one `unittest.TestCase` subclass, and an `if __name__ == "__main__": unittest.main()` footer (lines 31-32). Every new test file follows that layout.
- Constructor call style: `tests/test_soak_short.py:16` (`SlidingWindowLimiter(limit=LIMIT, window_seconds=WINDOW)`) and `tests/test_soak_long.py:18` (`Registry(lambda: SlidingWindowLimiter(...))`) fix the keyword names and the zero-argument factory.
- Naming: none beyond what the soak tests show. Use the class and method names from `design.md` exactly.
- Error handling: none. There is no existing pattern, and the design asks for none.
- CLI: none. There is no existing command-line code; use `argparse` with a subparser.

## Verification of this plan

Every code block below was run in a scratch copy of the repository on Python 3.15.0 before the plan was written. The 28 unit tests pass, both unmodified soak tests pass against that code (`test_soak_short` in 240 s, `test_soak_long` in 720 s), and the CLI values (`allowed=9 denied=16` for `--limit 3 --window 0.95 --calls 25`) came from running the code, not from hand arithmetic. Tests avoid windows that are whole multiples of 0.1 s, because repeated `+= 0.1` on a float drifts (ten additions give 0.9999999999999999), which would make boundary results flaky.

---

### Task 1: Package and clocks

**Risk tier:** standard — creates the package and a new module that every later task depends on.

**Files:**
- Create: `ratelimit/__init__.py`
- Create: `ratelimit/clock.py`
- Test: `tests/test_unit_clock.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ratelimit.clock.MonotonicClock()` with `now() -> float` (returns `time.monotonic()`).
  - `ratelimit.clock.FakeClock(start: float = 0.0)` with `now() -> float` and `advance(seconds: float) -> None`.

**Mirror:** `tests/test_soak_short.py:1-32`, the test-file layout (docstring, imports, `TestCase`, `__main__` footer).

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_clock.py`:

```python
"""Unit tests for ratelimit.clock."""

import time
import unittest

from ratelimit.clock import FakeClock, MonotonicClock


class FakeClockTest(unittest.TestCase):
    def test_starts_at_zero(self):
        self.assertEqual(FakeClock().now(), 0.0)

    def test_starts_at_given_time(self):
        self.assertEqual(FakeClock(start=12.5).now(), 12.5)

    def test_advance_moves_now_forward(self):
        clock = FakeClock()
        clock.advance(1.5)
        clock.advance(0.25)
        self.assertEqual(clock.now(), 1.75)

    def test_now_does_not_move_on_its_own(self):
        clock = FakeClock()
        first = clock.now()
        time.sleep(0.01)
        self.assertEqual(clock.now(), first)


class MonotonicClockTest(unittest.TestCase):
    def test_tracks_time_monotonic(self):
        clock = MonotonicClock()
        before = time.monotonic()
        reading = clock.now()
        after = time.monotonic()
        self.assertLessEqual(before, reading)
        self.assertLessEqual(reading, after)

    def test_never_goes_backwards(self):
        clock = MonotonicClock()
        first = clock.now()
        self.assertGreaterEqual(clock.now(), first)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py" -v`
Expected: an error for `test_unit_clock` with `ModuleNotFoundError: No module named 'ratelimit'`.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/__init__.py`:

```python
"""In-process rate limiting with the standard library only."""
```

Create `ratelimit/clock.py`:

```python
"""Clocks the limiters read time from."""

import time


class MonotonicClock:
    """Real time from time.monotonic."""

    def now(self) -> float:
        return time.monotonic()


class FakeClock:
    """A clock that moves only when advance() is called."""

    def __init__(self, start: float = 0.0):
        self._now = start

    def now(self) -> float:
        return self._now

    def advance(self, seconds: float) -> None:
        self._now += seconds
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py" -v`
Expected: 6 tests, `OK`.

- [ ] **Step 5: Commit**

```bash
git add ratelimit/__init__.py ratelimit/clock.py tests/test_unit_clock.py
git commit -m "feat: add ratelimit package with monotonic and fake clocks"
```

---

### Task 2: TokenBucket

**Risk tier:** standard — new module with refill arithmetic and a default-clock rule.

**Files:**
- Create: `ratelimit/bucket.py`
- Test: `tests/test_unit_bucket.py`

**Interfaces:**
- Consumes: `ratelimit.clock.MonotonicClock`, `ratelimit.clock.FakeClock` (Task 1).
- Produces: `ratelimit.bucket.TokenBucket(rate_per_second: float, capacity: int, clock=None)` with `allow() -> bool` and `tokens() -> float`. The clock is stored as `self._clock`; the unit test reads it to check the default.

**Mirror:** `tests/test_soak_short.py:1-32`, the test-file layout.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_bucket.py`:

```python
"""Unit tests for ratelimit.bucket."""

import unittest

from ratelimit.bucket import TokenBucket
from ratelimit.clock import FakeClock, MonotonicClock


class TokenBucketTest(unittest.TestCase):
    def setUp(self):
        self.clock = FakeClock()
        self.bucket = TokenBucket(rate_per_second=2.0, capacity=3, clock=self.clock)

    def test_starts_full(self):
        self.assertEqual(self.bucket.tokens(), 3.0)

    def test_allows_up_to_capacity_then_denies(self):
        results = [self.bucket.allow() for _ in range(4)]
        self.assertEqual(results, [True, True, True, False])
        self.assertEqual(self.bucket.tokens(), 0.0)

    def test_denied_call_spends_nothing(self):
        for _ in range(3):
            self.bucket.allow()
        self.clock.advance(0.25)
        self.assertFalse(self.bucket.allow())
        self.assertEqual(self.bucket.tokens(), 0.5)

    def test_refills_at_rate(self):
        for _ in range(3):
            self.bucket.allow()
        self.clock.advance(0.5)
        self.assertEqual(self.bucket.tokens(), 1.0)
        self.assertTrue(self.bucket.allow())
        self.assertFalse(self.bucket.allow())

    def test_refill_caps_at_capacity(self):
        self.bucket.allow()
        self.clock.advance(100)
        self.assertEqual(self.bucket.tokens(), 3.0)
        self.assertIsInstance(self.bucket.tokens(), float)

    def test_defaults_to_monotonic_clock(self):
        bucket = TokenBucket(rate_per_second=1.0, capacity=1)
        self.assertIsInstance(bucket._clock, MonotonicClock)
        self.assertTrue(bucket.allow())


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py" -v`
Expected: an error for `test_unit_bucket` with `ModuleNotFoundError: No module named 'ratelimit.bucket'`. The clock tests still pass.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/bucket.py`. Note `float(self._capacity)` in the cap: without it, `min()` returns the int capacity once the bucket is full and `tokens()` stops returning a float.

```python
"""Token bucket limiter."""

from ratelimit.clock import MonotonicClock


class TokenBucket:
    """Refills at rate_per_second up to capacity; each allowed call spends one token.

    The bucket starts full.
    """

    def __init__(self, rate_per_second: float, capacity: int, clock=None):
        self._rate = rate_per_second
        self._capacity = capacity
        self._clock = clock if clock is not None else MonotonicClock()
        self._tokens = float(capacity)
        self._last = self._clock.now()

    def _refill(self) -> None:
        now = self._clock.now()
        self._tokens = min(float(self._capacity), self._tokens + (now - self._last) * self._rate)
        self._last = now

    def tokens(self) -> float:
        self._refill()
        return self._tokens

    def allow(self) -> bool:
        self._refill()
        if self._tokens >= 1:
            self._tokens -= 1
            return True
        return False
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py" -v`
Expected: 12 tests, `OK`.

- [ ] **Step 5: Commit**

```bash
git add ratelimit/bucket.py tests/test_unit_bucket.py
git commit -m "feat: add token bucket limiter"
```

---

### Task 3: SlidingWindowLimiter

**Risk tier:** standard — new module; its correctness is what both soak tests measure.

**Files:**
- Create: `ratelimit/window.py`
- Test: `tests/test_unit_window.py`
- Covering command (existing, do not modify): `tests/test_soak_short.py`

**Interfaces:**
- Consumes: `ratelimit.clock.MonotonicClock`, `ratelimit.clock.FakeClock` (Task 1).
- Produces: `ratelimit.window.SlidingWindowLimiter(limit: int, window_seconds: float, clock=None)` with `allow() -> bool`. The clock is stored as `self._clock`. Task 4 and Task 5 construct it with keyword arguments `limit=`, `window_seconds=`, `clock=`.

**Mirror:** `tests/test_soak_short.py:1-32`, the test-file layout, and line 16 for the constructor keywords.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_window.py`:

```python
"""Unit tests for ratelimit.window."""

import unittest

from ratelimit.clock import FakeClock, MonotonicClock
from ratelimit.window import SlidingWindowLimiter


class SlidingWindowLimiterTest(unittest.TestCase):
    def setUp(self):
        self.clock = FakeClock()
        self.limiter = SlidingWindowLimiter(limit=3, window_seconds=2.0, clock=self.clock)

    def test_allows_limit_calls_then_denies(self):
        results = [self.limiter.allow() for _ in range(4)]
        self.assertEqual(results, [True, True, True, False])

    def test_call_frees_up_once_it_leaves_the_window(self):
        for _ in range(3):
            self.limiter.allow()
        self.clock.advance(1.9)
        self.assertFalse(self.limiter.allow())
        self.clock.advance(0.2)
        self.assertTrue(self.limiter.allow())

    def test_window_is_trailing_not_fixed(self):
        self.limiter.allow()          # t=0.0
        self.clock.advance(1.5)
        self.limiter.allow()          # t=1.5
        self.limiter.allow()          # t=1.5
        self.clock.advance(0.6)       # t=2.1: the t=0.0 call has left
        self.assertTrue(self.limiter.allow())
        self.assertFalse(self.limiter.allow())
        self.clock.advance(1.0)       # t=3.1: the t=1.5 calls are still inside
        self.assertFalse(self.limiter.allow())
        self.clock.advance(0.5)       # t=3.6: the t=1.5 calls have left
        self.assertTrue(self.limiter.allow())

    def test_denied_calls_do_not_count_against_the_limit(self):
        for _ in range(3):
            self.limiter.allow()
        for _ in range(10):
            self.assertFalse(self.limiter.allow())
        self.clock.advance(2.1)
        self.assertEqual([self.limiter.allow() for _ in range(4)], [True, True, True, False])

    def test_defaults_to_monotonic_clock(self):
        limiter = SlidingWindowLimiter(limit=1, window_seconds=1.0)
        self.assertIsInstance(limiter._clock, MonotonicClock)
        self.assertTrue(limiter.allow())


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py" -v`
Expected: an error for `test_unit_window` with `ModuleNotFoundError: No module named 'ratelimit.window'`. Earlier tests still pass.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/window.py`. The deque holds the timestamps of allowed calls, oldest first. Each `allow()` drops timestamps that have left the window, then admits the call only if fewer than `limit` remain.

```python
"""Sliding window limiter."""

from collections import deque

from ratelimit.clock import MonotonicClock


class SlidingWindowLimiter:
    """Allows at most limit calls in any trailing window of window_seconds."""

    def __init__(self, limit: int, window_seconds: float, clock=None):
        self._limit = limit
        self._window = window_seconds
        self._clock = clock if clock is not None else MonotonicClock()
        self._allowed = deque()

    def allow(self) -> bool:
        now = self._clock.now()
        while self._allowed and self._allowed[0] <= now - self._window:
            self._allowed.popleft()
        if len(self._allowed) < self._limit:
            self._allowed.append(now)
            return True
        return False
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py" -v`
Expected: 17 tests, `OK`.

- [ ] **Step 5: Run the covering soak test**

Run with the Bash tool's `run_in_background: true` (about 4 minutes) and wait for the completion notification:

`python3 -m unittest tests.test_soak_short -v`

Expected: `test_limit_holds_in_every_trailing_window ... ok`, then `Ran 1 test`, `OK`. If it fails, do not edit the soak test; use hyperpowers:systematic-debugging on `ratelimit/window.py`.

- [ ] **Step 6: Commit**

```bash
git add ratelimit/window.py tests/test_unit_window.py
git commit -m "feat: add sliding window limiter"
```

---

### Task 4: Registry and integration

**Risk tier:** standard — new module plus the cross-component integration check (registry with sliding windows across many keys).

**Files:**
- Create: `ratelimit/registry.py`
- Test: `tests/test_unit_registry.py`
- Covering command (existing, do not modify): `tests/test_soak_long.py`

**Interfaces:**
- Consumes: `ratelimit.window.SlidingWindowLimiter(limit=, window_seconds=, clock=)` (Task 3), `ratelimit.clock.FakeClock` (Task 1).
- Produces: `ratelimit.registry.Registry(factory)` where `factory` is called with no arguments and returns any object with `allow() -> bool`. Methods: `get(key: str)` returns that key's limiter, creating it on first use; `allow(key: str) -> bool`; `keys() -> list` of key strings in first-use order.

**Mirror:** `tests/test_soak_long.py:16-36`, the factory lambda and the per-key loop that the integration test scales down to FakeClock.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_registry.py`. `CountingLimiter` is a test double so the registry tests do not depend on any real limiter's timing. `RegistryWithSlidingWindowTest` is the fast integration test: real `SlidingWindowLimiter`s on one shared `FakeClock` across 50 keys.

```python
"""Unit tests for ratelimit.registry."""

import unittest

from ratelimit.clock import FakeClock
from ratelimit.registry import Registry
from ratelimit.window import SlidingWindowLimiter


class CountingLimiter:
    """Allows the first `limit` calls, then denies."""

    def __init__(self, limit):
        self.limit = limit
        self.calls = 0

    def allow(self):
        self.calls += 1
        return self.calls <= self.limit


class RegistryTest(unittest.TestCase):
    def test_get_creates_one_limiter_per_key(self):
        made = []
        registry = Registry(lambda: made.append(CountingLimiter(1)) or made[-1])
        first = registry.get("a")
        self.assertIs(registry.get("a"), first)
        self.assertIsNot(registry.get("b"), first)
        self.assertEqual(len(made), 2)

    def test_factory_is_called_with_no_arguments(self):
        calls = []

        def factory(*args, **kwargs):
            calls.append((args, kwargs))
            return CountingLimiter(1)

        Registry(factory).get("a")
        self.assertEqual(calls, [((), {})])

    def test_allow_delegates_to_the_keys_limiter(self):
        registry = Registry(lambda: CountingLimiter(2))
        self.assertEqual([registry.allow("a") for _ in range(3)], [True, True, False])
        self.assertTrue(registry.allow("b"))
        self.assertEqual(registry.get("a").calls, 3)
        self.assertEqual(registry.get("b").calls, 1)

    def test_keys_lists_keys_seen_in_first_use_order(self):
        registry = Registry(lambda: CountingLimiter(1))
        self.assertEqual(registry.keys(), [])
        registry.allow("b")
        registry.get("a")
        registry.allow("b")
        self.assertEqual(registry.keys(), ["b", "a"])


class RegistryWithSlidingWindowTest(unittest.TestCase):
    def test_each_key_keeps_its_own_window_on_a_shared_clock(self):
        clock = FakeClock()
        registry = Registry(lambda: SlidingWindowLimiter(limit=2, window_seconds=1.0, clock=clock))
        keys = [f"tenant-{n}" for n in range(50)]
        for key in keys:
            self.assertEqual([registry.allow(key) for _ in range(3)], [True, True, False])
        clock.advance(1.1)
        for key in keys:
            self.assertTrue(registry.allow(key))
        self.assertEqual(registry.keys(), keys)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py" -v`
Expected: an error for `test_unit_registry` with `ModuleNotFoundError: No module named 'ratelimit.registry'`. Earlier tests still pass.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/registry.py`. A plain `dict` keeps insertion order, which gives `keys()` its first-use order.

```python
"""One limiter per key."""


class Registry:
    """Creates a limiter per key on first use by calling factory()."""

    def __init__(self, factory):
        self._factory = factory
        self._limiters = {}

    def get(self, key: str):
        if key not in self._limiters:
            self._limiters[key] = self._factory()
        return self._limiters[key]

    def allow(self, key: str) -> bool:
        return self.get(key).allow()

    def keys(self) -> list:
        return list(self._limiters)
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py" -v`
Expected: 22 tests, `OK`.

- [ ] **Step 5: Run the covering soak test**

This takes about 12 minutes, longer than the Bash tool's 10-minute foreground limit. Run it with `run_in_background: true` and wait for the completion notification; do not poll:

`python3 -m unittest tests.test_soak_long -v`

Expected: `test_each_key_holds_its_limit ... ok`, then `Ran 1 test`, `OK`. If it fails, do not edit the soak test; use hyperpowers:systematic-debugging.

- [ ] **Step 6: Commit**

```bash
git add ratelimit/registry.py tests/test_unit_registry.py
git commit -m "feat: add per-key limiter registry"
```

---

### Task 5: `simulate` command line

**Risk tier:** standard — new entry-point module with argument parsing and a subprocess test.

**Files:**
- Create: `ratelimit/__main__.py`
- Test: `tests/test_unit_cli.py`

**Interfaces:**
- Consumes: `ratelimit.clock.FakeClock` (Task 1), `ratelimit.window.SlidingWindowLimiter(limit=, window_seconds=, clock=)` (Task 3).
- Produces:
  - `ratelimit.__main__.simulate(limit: int, window: float, calls: int) -> tuple` returning `(allowed, denied)` as ints.
  - `ratelimit.__main__.main(argv=None) -> int` that parses `simulate --limit N --window S --calls C`, prints `allowed=<a> denied=<d>`, and returns 0. `argparse` exits with status 2 on bad arguments.

**Mirror:** `tests/test_soak_short.py:1-32`, the test-file layout.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_cli.py`. The 0.95 s window is deliberate: a window that is a whole multiple of 0.1 s would put calls exactly on the boundary, where float drift from repeated `+= 0.1` decides the result.

```python
"""Unit tests for python3 -m ratelimit."""

import contextlib
import io
import subprocess
import sys
import unittest

from ratelimit.__main__ import main, simulate


class SimulateTest(unittest.TestCase):
    def test_counts_calls_against_a_window_of_fake_time(self):
        # Calls land at t=0.0, 0.1, ..., 2.4. With a 0.95 s window, three
        # calls get through in each of [0, 0.2], [1.0, 1.2] and [2.0, 2.2].
        self.assertEqual(simulate(limit=3, window=0.95, calls=25), (9, 16))

    def test_everything_allowed_under_the_limit(self):
        self.assertEqual(simulate(limit=10, window=5.0, calls=4), (4, 0))

    def test_zero_calls(self):
        self.assertEqual(simulate(limit=3, window=1.0, calls=0), (0, 0))


class MainTest(unittest.TestCase):
    def test_prints_allowed_and_denied(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = main(["simulate", "--limit", "3", "--window", "0.95", "--calls", "25"])
        self.assertEqual(code, 0)
        self.assertEqual(out.getvalue(), "allowed=9 denied=16\n")

    def test_missing_arguments_exit_with_usage_error(self):
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as caught:
                main(["simulate", "--limit", "3"])
        self.assertEqual(caught.exception.code, 2)

    def test_runs_as_a_module(self):
        result = subprocess.run(
            [sys.executable, "-m", "ratelimit", "simulate", "--limit", "3", "--window", "0.95", "--calls", "25"],
            capture_output=True,
            text=True,
            check=True,
        )
        self.assertEqual(result.stdout, "allowed=9 denied=16\n")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py" -v`
Expected: an error for `test_unit_cli` with `ModuleNotFoundError: No module named 'ratelimit.__main__'`. Earlier tests still pass.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/__main__.py`:

```python
"""Command line entry point: python3 -m ratelimit simulate ..."""

import argparse
import sys

from ratelimit.clock import FakeClock
from ratelimit.window import SlidingWindowLimiter

STEP_SECONDS = 0.1


def simulate(limit: int, window: float, calls: int) -> tuple:
    clock = FakeClock()
    limiter = SlidingWindowLimiter(limit=limit, window_seconds=window, clock=clock)
    allowed = 0
    for _ in range(calls):
        if limiter.allow():
            allowed += 1
        clock.advance(STEP_SECONDS)
    return allowed, calls - allowed


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="python3 -m ratelimit")
    commands = parser.add_subparsers(dest="command", required=True)
    sim = commands.add_parser("simulate", help="drive a sliding window with a fake clock")
    sim.add_argument("--limit", type=int, required=True)
    sim.add_argument("--window", type=float, required=True)
    sim.add_argument("--calls", type=int, required=True)
    args = parser.parse_args(argv)
    allowed, denied = simulate(args.limit, args.window, args.calls)
    print(f"allowed={allowed} denied={denied}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py" -v`
Expected: 28 tests, `OK`.

Then check the command by hand:

Run: `python3 -m ratelimit simulate --limit 3 --window 0.95 --calls 25`
Expected output: `allowed=9 denied=16`

- [ ] **Step 5: Commit**

```bash
git add ratelimit/__main__.py tests/test_unit_cli.py
git commit -m "feat: add simulate command line"
```
