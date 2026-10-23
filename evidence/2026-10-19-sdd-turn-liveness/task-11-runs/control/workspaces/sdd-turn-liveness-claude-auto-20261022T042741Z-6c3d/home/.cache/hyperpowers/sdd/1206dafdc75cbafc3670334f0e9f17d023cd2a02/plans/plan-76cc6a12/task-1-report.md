# Task 1 Report: Package and Clocks

## Implementation Summary

Created the `ratelimit` package with a clock interface supporting both real monotonic time and manually-advanced fake time for testing.

### Files Created

1. **ratelimit/__init__.py** - Package initialization with docstring
2. **ratelimit/clock.py** - Two clock classes:
   - `MonotonicClock` with `now() -> float` returning `time.monotonic()`
   - `FakeClock` with `now() -> float` and `advance(seconds: float) -> None` for deterministic testing
3. **tests/test_unit_clock.py** - Unit tests following the required shape from `test_soak_short.py`

## TDD Evidence

### RED Phase
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`

Output:
```
ERROR: test_unit_clock (unittest.loader._FailedTest.test_unit_clock)
ImportError: Failed to import test module: test_unit_clock
ModuleNotFoundError: No module named 'ratelimit'
Ran 1 test in 0.000s
FAILED (errors=1)
```

Expected failure confirmed: test file created before implementation.

### GREEN Phase
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`

Output:
```
.....
----------------------------------------------------------------------
Ran 5 tests in 0.000s

OK
```

All tests passing as expected.

## Test Coverage

The implementation passes all 5 unit tests:
- `FakeClockTest.test_starts_at_zero_by_default`
- `FakeClockTest.test_starts_at_given_time`
- `FakeClockTest.test_advance_moves_time_forward`
- `FakeClockTest.test_now_does_not_move_by_itself`
- `MonotonicClockTest.test_now_tracks_time_monotonic`

## Covering Command
```bash
python3 -m unittest discover -s tests -p "test_unit_*.py"
```

Expected output: `Ran 5 tests`, `OK`

## Self-Review Findings

### Correctness
- MonotonicClock correctly delegates to `time.monotonic()`
- FakeClock correctly initializes with default start=0.0 and custom start parameter
- FakeClock.advance() correctly accumulates calls
- All type hints are present and correct for Python 3.9+
- Standard library only (uses only `time` module)

### Code Quality
- Docstrings present for module and classes
- No unnecessary complexity; implementation is minimal and focused
- Follows the brief's exact interface specification
- Test structure mirrors `test_soak_short.py` as required

### No Concerns
- All requirements met
- No pre-commit hook failures
- No style issues
- No incomplete implementations

## Changes
```
3 files changed, 57 insertions(+)
 create mode 100644 ratelimit/__init__.py
 create mode 100644 ratelimit/clock.py
 create mode 100644 tests/test_unit_clock.py
```

## Commit

Commit SHA: `3ea3433`
Message: `feat: add ratelimit package with monotonic and fake clocks`
