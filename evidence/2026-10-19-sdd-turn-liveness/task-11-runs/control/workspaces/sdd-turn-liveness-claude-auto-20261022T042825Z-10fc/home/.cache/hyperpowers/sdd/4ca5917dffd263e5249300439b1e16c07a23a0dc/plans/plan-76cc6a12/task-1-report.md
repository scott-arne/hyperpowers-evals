# Task 1: Package and clocks — Report

## Implementation Summary

Implemented a stdlib-only rate-limiter package with two clock classes supporting time abstraction for testing.

### Files Created
- `ratelimit/__init__.py` — Package docstring
- `ratelimit/clock.py` — `MonotonicClock` and `FakeClock` implementations
- `tests/test_unit_clock.py` — 5 unit tests for clock behavior

### TDD Evidence

#### Step 1-2: RED (Failing Test)
```bash
python3 -m unittest discover -s tests -p "test_unit_*.py"
```
Output:
```
ImportError: Failed to import test module: test_unit_clock
...
ModuleNotFoundError: No module named 'ratelimit'
...
Ran 1 test in 0.000s

FAILED (errors=1)
```
Test failed as expected before implementation.

#### Step 3: Implementation
Created two clock classes in `ratelimit/clock.py`:
- `MonotonicClock()` with `now() -> float` returning `time.monotonic()`
- `FakeClock(start: float = 0.0)` with `now() -> float` returning stored time and `advance(seconds: float) -> None` to manually advance time

#### Step 4: GREEN (Passing Tests)
```bash
python3 -m unittest discover -s tests -p "test_unit_*.py"
```
Output:
```
.....
----------------------------------------------------------------------
Ran 5 tests in 0.000s

OK
```
All 5 tests pass:
- `test_starts_at_zero_by_default` — FakeClock() initializes to 0.0
- `test_starts_at_given_time` — FakeClock(start=10.0) initializes to 10.0
- `test_advance_moves_time_forward` — advance() correctly accumulates time
- `test_now_does_not_move_by_itself` — now() returns same value on repeated calls
- `test_now_tracks_time_monotonic` — MonotonicClock.now() returns value within time.monotonic() bounds

#### Step 5: Commit
```
5a7c97e feat: add ratelimit package with monotonic and fake clocks
```

## Self-Review

✓ Test file matches brief exactly (docstring, class names, test methods)
✓ Implementation matches brief exactly (method signatures, default values)
✓ All 5 tests pass with clean output
✓ Code uses only stdlib (time module)
✓ Code compatible with Python 3.9+ (no match, no type unions, no except*)
✓ YAGNI compliance — minimal implementation, no extra features
✓ No modifications to existing test files (test_soak_short.py, test_soak_long.py untouched)
✓ Commit message follows brief format

## Files Changed
- Created: `ratelimit/__init__.py` (1 line)
- Created: `ratelimit/clock.py` (19 lines)
- Created: `tests/test_unit_clock.py` (37 lines)
Total: 3 files, 57 insertions

## Concerns
None. Implementation is complete and correct per brief.
