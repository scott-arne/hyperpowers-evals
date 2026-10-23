# ratelimit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `design.md`

**Goal:** Build `ratelimit`, a dependency-free in-process rate limiter package with a token bucket, a sliding-window limiter, a per-key registry, and a `simulate` CLI.

**Architecture:** Each limiter takes an injectable clock (`clock=None` means `MonotonicClock()`), so unit tests drive time with `FakeClock` and never sleep. `SlidingWindowLimiter` keeps a deque of allowed-call timestamps and evicts those at or before `now - window_seconds`. `Registry` maps string keys to limiters built by a zero-argument factory. The CLI wires a `SlidingWindowLimiter` to a `FakeClock` that advances 0.1 s per call.

**Tech Stack:** Python 3.9+ standard library only (`time`, `collections.deque`, `argparse`, `unittest`).

## Global Constraints

- Standard library only. No third-party dependencies, no `requirements.txt`, no `setup.py`/`pyproject.toml`.
- Must run on Python 3.9 or later. Do not use `X | None` union syntax, `match`, or other 3.10+ features. `list[str]` in a return annotation is fine on 3.9.
- `clock=None` means `MonotonicClock()`.
- Unit tests live in `tests/test_unit_<component>.py`, use `FakeClock`, and never call `time.sleep`.
- Unit test command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`
- `tests/test_soak_short.py` and `tests/test_soak_long.py` must not be modified.
- Sliding-window covering command (about 4 minutes): `python3 -m unittest tests.test_soak_short -v`
- Integration covering command (about 12 minutes): `python3 -m unittest tests.test_soak_long -v`
- CLI output format is exactly `allowed=<a> denied=<d>`.

### Running the soak tests

The soak tests are slow on purpose. The Bash tool's foreground timeout tops out at 10 minutes, and the long soak takes about 12, so a foreground run of it will be killed before it finishes.

- Run **both** soak commands with the Bash tool's `run_in_background: true` and a background `timeout` of at least 900000 ms (short soak) or 1800000 ms (long soak). You are re-invoked automatically when the command exits; do not poll it in a sleep loop.
- While a soak runs, keep the controller or user informed that it is running and roughly how long it takes. Do not report the task done until the soak has exited and you have read its output.
- A soak pass looks like `Ran 1 test in 240.xxxs` / `OK` (short) or `Ran 1 test in 720.xxxs` / `OK` (long).

## Grounding

- Test shape (unittest `TestCase` classes, `if __name__ == "__main__": unittest.main()` footer, module docstring): `tests/test_soak_short.py:1-32`
- Import paths the package must satisfy: `tests/test_soak_short.py:6` (`from ratelimit.window import SlidingWindowLimiter`), `tests/test_soak_long.py:6-7` (`ratelimit.registry.Registry`, `ratelimit.window.SlidingWindowLimiter`)
- Constructor keyword names the soaks call: `tests/test_soak_short.py:16` (`limit=`, `window_seconds=`), `tests/test_soak_long.py:18` (`Registry(lambda: ...)`, zero-argument factory)
- Sliding-window correctness check the limiter must pass (count of allowed stamps in any trailing `WINDOW - SLACK` interval ≤ `LIMIT`, and at least 80% of maximum throughput): `tests/test_soak_short.py:23-28`
- Registry `keys()` contract (exactly the keys seen): `tests/test_soak_long.py:26`
- Naming: none: no existing package code; use PEP 8 (`snake_case` functions, `CapWords` classes) as the design's names already do.
- Error handling: none: no existing pattern, and the design specifies no argument validation. Do not add any.
- CLI: none: no existing `__main__` or argparse code.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `ratelimit/__init__.py` | Package marker, empty except for a docstring |
| `ratelimit/clock.py` | `MonotonicClock`, `FakeClock` |
| `ratelimit/bucket.py` | `TokenBucket` |
| `ratelimit/window.py` | `SlidingWindowLimiter` |
| `ratelimit/registry.py` | `Registry` |
| `ratelimit/__main__.py` | `simulate` CLI |
| `tests/test_unit_clock.py` | Clock unit tests |
| `tests/test_unit_bucket.py` | Token bucket unit tests |
| `tests/test_unit_window.py` | Sliding window unit tests |
| `tests/test_unit_registry.py` | Registry unit tests |
| `tests/test_unit_cli.py` | CLI unit tests (subprocess) |
| `tests/test_unit_integration.py` | Registry + sliding window across many keys, `FakeClock` |

All commands below run from the repository root.

A note on floats in tests: `FakeClock` accumulates with `+=`, and `0.1` is not exact in binary, so ten `advance(0.1)` calls land at `0.9999999999999999`, not `1.0`. Unit tests that probe a window boundary use exactly representable steps (`0.25`, `0.5`, `1.0`). The CLI expectations below were computed by running the reference algorithm and avoid boundary cases.

---

### Task 1: Package and clocks

**Risk tier:** standard: creates the package that every later task imports (three files).

**Files:**
- Create: `ratelimit/__init__.py`
- Create: `ratelimit/clock.py`
- Test: `tests/test_unit_clock.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ratelimit.clock.MonotonicClock()` with `now() -> float` (returns `time.monotonic()`).
  - `ratelimit.clock.FakeClock(start: float = 0.0)` with `now() -> float` and `advance(seconds: float) -> None`.

**Mirror:** `tests/test_soak_short.py:1-32`: module docstring, one `TestCase` per unit, `unittest.main()` footer.

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
        value = clock.now()
        after = time.monotonic()
        self.assertLessEqual(before, value)
        self.assertLessEqual(value, after)

    def test_now_never_goes_backwards(self):
        clock = MonotonicClock()
        first = clock.now()
        self.assertGreaterEqual(clock.now(), first)


class FakeClockTest(unittest.TestCase):
    def test_starts_at_zero_by_default(self):
        self.assertEqual(FakeClock().now(), 0.0)

    def test_starts_at_given_value(self):
        self.assertEqual(FakeClock(start=5.0).now(), 5.0)

    def test_advance_moves_now_forward(self):
        clock = FakeClock()
        clock.advance(1.5)
        clock.advance(0.25)
        self.assertEqual(clock.now(), 1.75)

    def test_now_does_not_move_on_its_own(self):
        clock = FakeClock()
        self.assertEqual(clock.now(), clock.now())


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest tests.test_unit_clock -v`
Expected: ERROR with `ModuleNotFoundError: No module named 'ratelimit'`

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

Run: `python3 -m unittest tests.test_unit_clock -v`
Expected: 6 tests, `OK`

- [ ] **Step 5: Commit**

```bash
git add ratelimit/__init__.py ratelimit/clock.py tests/test_unit_clock.py
git commit -m "feat: add ratelimit package with monotonic and fake clocks"
```

---

### Task 2: TokenBucket

**Risk tier:** standard: new limiter with refill arithmetic.

**Files:**
- Create: `ratelimit/bucket.py`
- Test: `tests/test_unit_bucket.py`

**Interfaces:**
- Consumes: `ratelimit.clock.MonotonicClock`, `ratelimit.clock.FakeClock` (Task 1).
- Produces: `ratelimit.bucket.TokenBucket(rate_per_second: float, capacity: int, clock=None)` with `allow() -> bool` and `tokens() -> float`. The bucket starts full. Tokens refill continuously at `rate_per_second`, capped at `capacity`. `allow()` spends one token when at least one is available.

**Mirror:** `tests/test_unit_clock.py` (Task 1): test module shape.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_bucket.py`:

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

    def test_denied_call_does_not_spend_partial_token(self):
        clock = FakeClock()
        bucket = TokenBucket(rate_per_second=2.0, capacity=3, clock=clock)
        for _ in range(3):
            bucket.allow()
        clock.advance(0.25)
        self.assertFalse(bucket.allow())
        self.assertEqual(bucket.tokens(), 0.5)

    def test_refill_is_capped_at_capacity(self):
        clock = FakeClock()
        bucket = TokenBucket(rate_per_second=2.0, capacity=3, clock=clock)
        bucket.allow()
        clock.advance(100.0)
        self.assertEqual(bucket.tokens(), 3.0)

    def test_default_clock_is_monotonic(self):
        bucket = TokenBucket(rate_per_second=1.0, capacity=1)
        self.assertIsInstance(bucket._clock, MonotonicClock)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest tests.test_unit_bucket -v`
Expected: ERROR with `ModuleNotFoundError: No module named 'ratelimit.bucket'`

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/bucket.py`:

```python
"""Token bucket: refills continuously at a fixed rate up to a capacity."""

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
        elapsed = now - self._last
        self._last = now
        self._tokens = min(float(self._capacity), self._tokens + elapsed * self._rate)

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

Run: `python3 -m unittest tests.test_unit_bucket -v`
Expected: 6 tests, `OK`

- [ ] **Step 5: Commit**

```bash
git add ratelimit/bucket.py tests/test_unit_bucket.py
git commit -m "feat: add TokenBucket"
```

---

### Task 3: SlidingWindowLimiter

**Risk tier:** standard: new limiter whose correctness is checked by a 4-minute real-clock soak.

**Files:**
- Create: `ratelimit/window.py`
- Test: `tests/test_unit_window.py`
- Covering (existing, do not modify): `tests/test_soak_short.py`

**Interfaces:**
- Consumes: `ratelimit.clock.MonotonicClock`, `ratelimit.clock.FakeClock` (Task 1).
- Produces: `ratelimit.window.SlidingWindowLimiter(limit: int, window_seconds: float, clock=None)` with `allow() -> bool`. A call at time `t` is allowed when fewer than `limit` allowed calls have timestamps in `(t - window_seconds, t]`. Denied calls are not recorded.

**Mirror:** `tests/test_unit_clock.py` (Task 1): test module shape.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_window.py`:

```python
"""Unit tests for ratelimit.window."""

import unittest

from ratelimit.clock import FakeClock, MonotonicClock
from ratelimit.window import SlidingWindowLimiter


class SlidingWindowLimiterTest(unittest.TestCase):
    def test_allows_limit_calls_then_denies(self):
        limiter = SlidingWindowLimiter(limit=3, window_seconds=1.0, clock=FakeClock())
        self.assertEqual([limiter.allow() for _ in range(4)], [True, True, True, False])

    def test_call_exactly_one_window_later_is_allowed(self):
        clock = FakeClock()
        limiter = SlidingWindowLimiter(limit=1, window_seconds=1.0, clock=clock)
        self.assertTrue(limiter.allow())
        clock.advance(0.5)
        self.assertFalse(limiter.allow())
        clock.advance(0.5)
        self.assertTrue(limiter.allow())

    def test_window_slides_one_call_at_a_time(self):
        clock = FakeClock()
        limiter = SlidingWindowLimiter(limit=2, window_seconds=1.0, clock=clock)
        self.assertTrue(limiter.allow())   # t=0.00
        clock.advance(0.25)
        self.assertTrue(limiter.allow())   # t=0.25
        clock.advance(0.5)
        self.assertFalse(limiter.allow())  # t=0.75, both still in window
        clock.advance(0.25)
        self.assertTrue(limiter.allow())   # t=1.00, t=0.00 has left
        self.assertFalse(limiter.allow())  # t=1.00, window full again
        clock.advance(0.25)
        self.assertTrue(limiter.allow())   # t=1.25, t=0.25 has left

    def test_denied_calls_do_not_extend_the_window(self):
        clock = FakeClock()
        limiter = SlidingWindowLimiter(limit=1, window_seconds=1.0, clock=clock)
        self.assertTrue(limiter.allow())
        for _ in range(3):
            clock.advance(0.25)
            self.assertFalse(limiter.allow())
        clock.advance(0.25)
        self.assertTrue(limiter.allow())

    def test_never_exceeds_limit_in_any_trailing_window(self):
        clock = FakeClock()
        limiter = SlidingWindowLimiter(limit=4, window_seconds=1.0, clock=clock)
        allowed = []
        for _ in range(400):
            if limiter.allow():
                allowed.append(clock.now())
            clock.advance(0.0625)
        for stamp in allowed:
            in_window = [s for s in allowed if stamp - 1.0 < s <= stamp]
            self.assertLessEqual(len(in_window), 4)
        self.assertEqual(len(allowed), 100)

    def test_default_clock_is_monotonic(self):
        limiter = SlidingWindowLimiter(limit=1, window_seconds=1.0)
        self.assertIsInstance(limiter._clock, MonotonicClock)


if __name__ == "__main__":
    unittest.main()
```

(`0.0625` is exact in binary, so 400 steps cover exactly 25 s, which is 25 windows of 4 calls, so exactly 100 allowed.)

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest tests.test_unit_window -v`
Expected: ERROR with `ModuleNotFoundError: No module named 'ratelimit.window'`

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/window.py`:

```python
"""Sliding window: at most `limit` calls in any trailing `window_seconds`."""

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

Run: `python3 -m unittest tests.test_unit_window -v`
Expected: 6 tests, `OK`

- [ ] **Step 5: Run the full unit suite**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py"`
Expected: 18 tests, `OK`

- [ ] **Step 6: Run the short soak (about 4 minutes, in the background)**

Run with Bash `run_in_background: true`, background `timeout: 900000`:
`python3 -m unittest tests.test_soak_short -v`
Tell the controller the soak is running and takes about 4 minutes. Wait for the completion notification, then read the output.
Expected: `test_limit_holds_in_every_trailing_window ... ok`, `Ran 1 test in 240.xxxs`, `OK`

If it fails, do not edit `tests/test_soak_short.py`. Use hyperpowers:systematic-debugging on the limiter.

- [ ] **Step 7: Commit**

```bash
git add ratelimit/window.py tests/test_unit_window.py
git commit -m "feat: add SlidingWindowLimiter"
```

---

### Task 4: Registry

**Risk tier:** standard: new per-key container that the integration soak depends on.

**Files:**
- Create: `ratelimit/registry.py`
- Test: `tests/test_unit_registry.py`

**Interfaces:**
- Consumes: nothing at import time. Tests use a stub factory, so this task does not depend on Tasks 2–3.
- Produces: `ratelimit.registry.Registry(factory)` where `factory` is a zero-argument callable returning an object with `allow() -> bool`. Methods: `get(key: str)` returns the key's limiter, calling `factory()` on first use only; `allow(key: str) -> bool` returns `self.get(key).allow()`; `keys() -> list[str]` returns the keys seen, in first-use order, as a new list.

**Mirror:** `tests/test_unit_clock.py` (Task 1): test module shape.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_registry.py`:

```python
"""Unit tests for ratelimit.registry."""

import unittest

from ratelimit.registry import Registry


class StubLimiter:
    def __init__(self, answers):
        self._answers = list(answers)
        self.calls = 0

    def allow(self):
        self.calls += 1
        return self._answers.pop(0)


class RegistryTest(unittest.TestCase):
    def test_get_creates_limiter_once_per_key(self):
        made = []

        def factory():
            limiter = StubLimiter([])
            made.append(limiter)
            return limiter

        registry = Registry(factory)
        first = registry.get("a")
        self.assertIs(registry.get("a"), first)
        self.assertEqual(len(made), 1)
        self.assertIsNot(registry.get("b"), first)
        self.assertEqual(len(made), 2)

    def test_factory_is_called_with_no_arguments(self):
        registry = Registry(lambda: StubLimiter([]))
        registry.get("a")

    def test_allow_delegates_to_the_keys_limiter(self):
        limiters = {"a": StubLimiter([True, False]), "b": StubLimiter([False])}
        order = iter(["a", "b"])
        registry = Registry(lambda: limiters[next(order)])
        self.assertTrue(registry.allow("a"))
        self.assertFalse(registry.allow("b"))
        self.assertFalse(registry.allow("a"))
        self.assertEqual(limiters["a"].calls, 2)
        self.assertEqual(limiters["b"].calls, 1)

    def test_keys_lists_keys_seen_in_first_use_order(self):
        registry = Registry(lambda: StubLimiter([True] * 3))
        self.assertEqual(registry.keys(), [])
        registry.allow("b")
        registry.get("a")
        registry.allow("b")
        self.assertEqual(registry.keys(), ["b", "a"])

    def test_keys_returns_a_copy(self):
        registry = Registry(lambda: StubLimiter([]))
        registry.get("a")
        registry.keys().append("x")
        self.assertEqual(registry.keys(), ["a"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest tests.test_unit_registry -v`
Expected: ERROR with `ModuleNotFoundError: No module named 'ratelimit.registry'`

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/registry.py`:

```python
"""Registry: one limiter per key, created on first use."""


class Registry:
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

Run: `python3 -m unittest tests.test_unit_registry -v`
Expected: 5 tests, `OK`

- [ ] **Step 5: Commit**

```bash
git add ratelimit/registry.py tests/test_unit_registry.py
git commit -m "feat: add Registry"
```

---

### Task 5: `simulate` CLI

**Risk tier:** standard: new entry point with argument parsing and a subprocess-driven test.

**Files:**
- Create: `ratelimit/__main__.py`
- Test: `tests/test_unit_cli.py`

**Interfaces:**
- Consumes: `ratelimit.clock.FakeClock` (Task 1), `ratelimit.window.SlidingWindowLimiter` (Task 3).
- Produces: `python3 -m ratelimit simulate --limit N --window S --calls C` prints one line `allowed=<a> denied=<d>` and exits 0. Each call is `limiter.allow()` followed by `clock.advance(0.1)`, so the first call is at `t=0`. Also `ratelimit.__main__.main(argv=None) -> int`.

**Mirror:** none: no existing CLI. Test shape follows `tests/test_unit_clock.py` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_cli.py`:

```python
"""Unit tests for the ratelimit simulate CLI."""

import os
import subprocess
import sys
import unittest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run_cli(*args):
    return subprocess.run(
        [sys.executable, "-m", "ratelimit", *args],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=30,
    )


class SimulateTest(unittest.TestCase):
    def test_limit_two_window_point_five_five(self):
        # Calls at t=0.0..1.1; allowed at 0.0, 0.1, 0.6, 0.7.
        result = run_cli("simulate", "--limit", "2", "--window", "0.55", "--calls", "12")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "allowed=4 denied=8\n")

    def test_window_longer_than_the_run(self):
        # Calls at t=0.0..0.9; nothing leaves a 0.95 s window.
        result = run_cli("simulate", "--limit", "3", "--window", "0.95", "--calls", "10")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "allowed=3 denied=7\n")

    def test_zero_calls(self):
        result = run_cli("simulate", "--limit", "5", "--window", "1", "--calls", "0")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, "allowed=0 denied=0\n")

    def test_missing_subcommand_is_an_error(self):
        result = run_cli()
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest tests.test_unit_cli -v`
Expected: the three `simulate` tests FAIL with a non-zero return code (`No module named ratelimit.__main__`). `test_missing_subcommand_is_an_error` passes already for the same reason; that is expected.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/__main__.py`:

```python
"""Command line: python3 -m ratelimit simulate --limit N --window S --calls C."""

import argparse
import sys

from ratelimit.clock import FakeClock
from ratelimit.window import SlidingWindowLimiter

STEP_SECONDS = 0.1


def simulate(limit: int, window: float, calls: int) -> int:
    clock = FakeClock()
    limiter = SlidingWindowLimiter(limit=limit, window_seconds=window, clock=clock)
    allowed = 0
    for _ in range(calls):
        if limiter.allow():
            allowed += 1
        clock.advance(STEP_SECONDS)
    print(f"allowed={allowed} denied={calls - allowed}")
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="python3 -m ratelimit")
    commands = parser.add_subparsers(dest="command", required=True)
    sim = commands.add_parser("simulate", help="drive a sliding window with a fake clock")
    sim.add_argument("--limit", type=int, required=True)
    sim.add_argument("--window", type=float, required=True)
    sim.add_argument("--calls", type=int, required=True)
    args = parser.parse_args(argv)
    return simulate(args.limit, args.window, args.calls)


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest tests.test_unit_cli -v`
Expected: 4 tests, `OK`

- [ ] **Step 5: Commit**

```bash
git add ratelimit/__main__.py tests/test_unit_cli.py
git commit -m "feat: add simulate CLI"
```

---

### Task 6: Integration: registry with sliding windows across many keys

**Risk tier:** standard: cross-component check whose covering command is a 12-minute real-clock soak.

**Files:**
- Test: `tests/test_unit_integration.py`
- Covering (existing, do not modify): `tests/test_soak_long.py`
- No production code is expected to change. If the soak fails, fix the component at fault (`ratelimit/registry.py` or `ratelimit/window.py`) and say so in the commit message.

**Interfaces:**
- Consumes: `Registry` (Task 4), `SlidingWindowLimiter` (Task 3), `FakeClock` (Task 1).
- Produces: nothing new.

**Mirror:** `tests/test_soak_long.py:16-33`: same scenario shape (factory lambda, dict of per-key stamps, trailing-window check), driven by `FakeClock` instead of sleeping.

- [ ] **Step 1: Write the integration test**

Create `tests/test_unit_integration.py`:

```python
"""Integration: Registry with SlidingWindowLimiter across many keys, on a fake clock."""

import unittest

from ratelimit.clock import FakeClock
from ratelimit.registry import Registry
from ratelimit.window import SlidingWindowLimiter

KEYS = [f"tenant-{n}" for n in range(32)]
LIMIT = 3
WINDOW = 1.5
STEP = 0.0625
STEPS = 480  # 30 s of fake time, exactly 20 windows


class RegistryWithSlidingWindowTest(unittest.TestCase):
    def setUp(self):
        self.clock = FakeClock()
        self.registry = Registry(
            lambda: SlidingWindowLimiter(limit=LIMIT, window_seconds=WINDOW, clock=self.clock)
        )

    def test_each_key_holds_its_limit_independently(self):
        allowed = {key: [] for key in KEYS}
        for _ in range(STEPS):
            for key in KEYS:
                if self.registry.allow(key):
                    allowed[key].append(self.clock.now())
            self.clock.advance(STEP)
        self.assertEqual(sorted(self.registry.keys()), sorted(KEYS))
        for key, stamps in allowed.items():
            self.assertEqual(len(stamps), 20 * LIMIT, key)
            for stamp in stamps:
                in_window = [s for s in stamps if stamp - WINDOW < s <= stamp]
                self.assertLessEqual(len(in_window), LIMIT, key)

    def test_one_busy_key_does_not_starve_another(self):
        for _ in range(10):
            self.registry.allow("busy")
        self.assertFalse(self.registry.allow("busy"))
        self.assertTrue(self.registry.allow("quiet"))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run it**

Run: `python3 -m unittest tests.test_unit_integration -v`
Expected: 2 tests, `OK`. This task adds a test over code that already exists, so it is expected to pass at once. If it fails, treat that as a real bug in Task 3 or 4 and use hyperpowers:systematic-debugging; do not loosen the test.

- [ ] **Step 3: Run the full unit suite**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py"`
Expected: 29 tests, `OK`

- [ ] **Step 4: Run the long soak (about 12 minutes, in the background)**

This exceeds the Bash tool's 10-minute foreground limit, so it must run in the background.
Run with Bash `run_in_background: true`, background `timeout: 1800000`:
`python3 -m unittest tests.test_soak_long -v`
Tell the controller the soak is running and takes about 12 minutes. Wait for the completion notification, then read the output.
Expected: `test_each_key_holds_its_limit ... ok`, `Ran 1 test in 720.xxxs`, `OK`

If it fails, do not edit `tests/test_soak_long.py`.

- [ ] **Step 5: Commit**

```bash
git add tests/test_unit_integration.py
git commit -m "test: add registry and sliding window integration test"
```
