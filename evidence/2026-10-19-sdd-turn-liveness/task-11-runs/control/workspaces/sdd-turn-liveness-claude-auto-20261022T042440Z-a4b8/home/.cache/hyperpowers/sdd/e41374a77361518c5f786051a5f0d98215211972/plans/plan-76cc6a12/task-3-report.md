# Task 3: Sliding Window Limiter - Report

## Implementation Summary

Implemented the `SlidingWindowLimiter` class in `ratelimit/window.py` following TDD methodology:

1. **Created test file**: `tests/test_unit_window.py` with 5 unit tests covering:
   - Allows up to limit then denies
   - Window expiration behavior (stamps exactly one window old)
   - Sliding window semantics (slides one stamp at a time)
   - Denied calls are not recorded
   - Default clock is MonotonicClock

2. **Implemented core module**: `ratelimit/window.py` with:
   - `SlidingWindowLimiter` class with constructor accepting `limit`, `window_seconds`, and optional `clock`
   - `allow()` method implementing sliding window logic
   - Uses `collections.deque` for efficient O(1) stamp eviction
   - Properly handles `clock=None` by defaulting to `MonotonicClock()`

## TDD Evidence

### RED Step
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`
Output:
```
ERROR: test_unit_window (unittest.loader._FailedTest.test_unit_window)
----------------------------------------------------------------------
ImportError: Failed to import test module: test_unit_window
...
ModuleNotFoundError: No module named 'ratelimit.window'. Did you mean: 'ratelimit.__init__'?
```

### GREEN Step
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`
Output:
```
................
----------------------------------------------------------------------
Ran 16 tests in 0.001s

OK
```

## Covering Test Results

### Unit Tests
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`
Output:
```
................
----------------------------------------------------------------------
Ran 16 tests in 0.001s

OK
```
- 16 tests passed (existing 11 + new 5)
- Execution time: < 1 second

### Soak Test (Short)
Command: `python3 -m unittest tests.test_soak_short -v`
Output:
```
test_limit_holds_in_every_trailing_window (tests.test_soak_short.SlidingWindowSoak.test_limit_holds_in_every_trailing_window) ... ok

----------------------------------------------------------------------
Ran 1 test in 240.002s

OK
```
- Test verifies sliding window semantics with real-time clock simulation
- 240 seconds (~4 minutes) real time execution
- Passes all window boundary and throughput assertions

## Files Changed

1. **Created**: `ratelimit/window.py` (23 lines)
   - `SlidingWindowLimiter` class
   - Uses `collections.deque` for stamp management
   - Implements cutoff-based eviction: stamps older than `now - window_seconds` are removed

2. **Created**: `tests/test_unit_window.py` (50 lines)
   - 5 comprehensive unit tests
   - Uses `FakeClock` for deterministic testing
   - Tests boundary conditions and semantic correctness

## Self-Review Findings

- ✓ Implementation exactly matches brief specification
- ✓ No extra features added
- ✓ All tests pass (16 unit + 1 soak)
- ✓ Code follows Python 3.9+ constraints (no match, no `|` unions, no except*)
- ✓ Standard library only (uses `collections.deque`)
- ✓ Default clock behavior correct (MonotonicClock when `clock=None`)
- ✓ Sliding window logic correct: eviction at `<=cutoff`, record on allowed calls only
- ✓ Committed with attribution: `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>`

## Concerns

None. Implementation is complete and all tests pass.

## Commit

SHA: `9f2669c`
Message: `feat: add sliding window limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>`
