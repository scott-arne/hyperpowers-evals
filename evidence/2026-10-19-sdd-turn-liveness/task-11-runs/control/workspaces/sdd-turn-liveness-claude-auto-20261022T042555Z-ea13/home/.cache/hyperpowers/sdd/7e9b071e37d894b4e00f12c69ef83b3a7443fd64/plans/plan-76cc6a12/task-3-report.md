# Task 3: Sliding Window Limiter - Report

## What Was Implemented

Created a sliding window rate limiter module `SlidingWindowLimiter` in `ratelimit/window.py` that:
- Tracks request timestamps in a deque
- Evicts timestamps older than the window (at most `limit` calls in any trailing `window_seconds`)
- Returns `True` when allowed, `False` when limit exceeded
- Records only allowed calls (denied calls are not stamped)
- Defaults to `MonotonicClock` when no clock is provided
- Exports for use by soak tests, Task 5, and Task 6

## TDD Evidence

### RED Phase
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`

Output excerpt (before implementation):
```
ERROR: test_unit_window (unittest.loader._FailedTest.test_unit_window)
...
ModuleNotFoundError: No module named 'ratelimit.window'
...
Ran 12 tests in 0.000s
FAILED (errors=1)
```

Expected failure: Module did not exist yet.

### GREEN Phase
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py" -v`

Output (final, after implementation):
```
test_allows_up_to_limit_then_denies (test_unit_window.SlidingWindowLimiterTest.test_allows_up_to_limit_then_denies) ... ok
test_default_clock_is_monotonic (test_unit_window.SlidingWindowLimiterTest.test_default_clock_is_monotonic) ... ok
test_denied_calls_are_not_recorded (test_unit_window.SlidingWindowLimiterTest.test_denied_calls_are_not_recorded) ... ok
test_stamp_exactly_one_window_old_no_longer_counts (test_unit_window.SlidingWindowLimiterTest.test_stamp_exactly_one_window_old_no_longer_counts) ... ok
test_window_slides_one_stamp_at_a_time (test_unit_window.SlidingWindowLimiterTest.test_window_slides_one_stamp_at_a_time) ... ok
...
Ran 16 tests in 0.000s
OK
```

### Soak Test
Command: `python3 -m unittest tests.test_soak_short -v`

Output:
```
test_limit_holds_in_every_trailing_window (tests.test_soak_short.SlidingWindowSoak.test_limit_holds_in_every_trailing_window) ... ok
Ran 1 test in 240.014s
OK
```

All tests pass with correct timing semantics.

## Files Changed

- **Created:** `ratelimit/window.py` (23 lines)
  - `SlidingWindowLimiter` class with `__init__` and `allow()` method
  - Deque-based tracking with window-aware eviction
  
- **Created:** `tests/test_unit_window.py` (50 lines)
  - 5 test methods covering limit enforcement, window boundaries, sliding behavior, and denial semantics
  - Follows test module shape from `test_soak_short.py:1-32`

## Self-Review

**Completeness:** Task fully completed per brief.
- Step 1: Test file created with exact code from brief ✓
- Step 2: RED verified (ModuleNotFoundError) ✓
- Step 3: Implementation created with exact code from brief ✓
- Step 4: GREEN verified (16 tests pass) ✓
- Step 5: Soak test verified (240s, OK) ✓
- Step 6: Commit created with correct message ✓

**Code Quality:**
- Implementation is minimal and correct
- Uses deque for O(1) eviction
- Cutoff comparison `stamps[0] <= cutoff` is correct (allows exact boundary)
- Denied calls are not recorded in deque
- Default clock is `MonotonicClock`
- No modifications to existing files (clock.py, bucket.py, soak tests)
- No __pycache__ staged

**Test Coverage:**
- 5 unit tests all pass
- Soak test passes with tight timing (4 minutes real-time)
- Edge cases covered: boundary semantics, sliding behavior, denial handling

**No concerns.**
