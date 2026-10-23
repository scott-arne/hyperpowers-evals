# Task 1 Report: Package and clocks

## Implementation Summary

Implemented the ratelimit package with two clock classes following the TDD specification exactly.

### Files Created
1. **`ratelimit/__init__.py`**: Package module docstring
2. **`ratelimit/clock.py`**: Two clock classes (MonotonicClock and FakeClock)
3. **`tests/test_unit_clock.py`**: Unit tests for both clock classes

### Implementation Details

#### MonotonicClock
- `now() -> float`: Returns `time.monotonic()` value
- No state; creates fresh instance per call

#### FakeClock
- `__init__(start: float = 0.0)`: Initializes internal clock to given start time (default 0.0)
- `now() -> float`: Returns current internal time without advancing it
- `advance(seconds: float) -> None`: Advances internal time by given seconds

## TDD Evidence

### RED (Step 2: Test Fails)
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`

Output showed ImportError as expected:
```
ModuleNotFoundError: No module named 'ratelimit'
Ran 1 test in 0.000s
FAILED (errors=1)
```

### GREEN (Step 4: Test Passes)
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`

Output:
```
.....
----------------------------------------------------------------------
Ran 5 tests in 0.000s

OK
```

All 5 tests pass:
- 4 FakeClock tests: default start value, custom start value, advance accumulation, time doesn't auto-advance
- 1 MonotonicClock test: value falls within expected time.monotonic() bounds

## Self-Review

**Completeness**: ✓ Implements all interfaces from brief
- MonotonicClock.now() returns time.monotonic()
- FakeClock with start parameter and advance() method
- All test cases pass

**No Extras (YAGNI)**: ✓ Minimal implementation
- Only what brief specifies
- No extra methods or attributes
- Standard library only (uses time.monotonic())

**Test Quality**: ✓ Tests verify real behavior
- FakeClock tests validate initialization, advancement, and immutability
- MonotonicClock test validates time.monotonic() integration
- All assertions are specific and meaningful

**Standards Compliance**: ✓ Follows global constraints
- Python 3.9+ compatible (no match, no | unions)
- Standard library only
- Clock interface matches design.md names exactly

## Commit

```
e69e972 feat: add ratelimit package with monotonic and fake clocks
```

## Concerns

None. Implementation is straightforward, all tests pass, and matches the brief specification exactly.
