# Task 2 Report: Token Bucket

## Summary
Implemented `TokenBucket` rate limiter with continuous refill and token-per-call spend model. Task completed successfully following TDD (RED → GREEN).

## Implementation Details

### Files Created/Modified
1. **ratelimit/bucket.py** (new)
   - `TokenBucket(rate_per_second: float, capacity: int, clock=None)` class
   - `allow() -> bool`: Checks refill, spends one token if available
   - `tokens() -> float`: Returns current token count after refill
   - `_refill()`: Internal method that calculates token accumulation capped at capacity
   - Default clock is `MonotonicClock()`; supports injection of `FakeClock` for testing

2. **tests/test_unit_bucket.py** (new)
   - 6 test cases covering:
     - Bucket starts full
     - Token spend until empty
     - Denied calls don't spend tokens
     - Refill at specified rate
     - Refill is capped at capacity
     - Default clock is MonotonicClock

## TDD Evidence

### RED: Test Creation and Initial Run
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`

Initial output (test file created, implementation missing):
```
ERROR: test_unit_bucket (unittest.loader._FailedTest.test_unit_bucket)
ImportError: Failed to import test module: test_unit_bucket
...
ModuleNotFoundError: No module named 'ratelimit.bucket'

Ran 6 tests in 0.000s
FAILED (errors=1)
```

Reason: Expected failure because `ratelimit.bucket` module did not exist yet.

### GREEN: Implementation and Passing Tests
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`

Final output (after implementation):
```
...........
----------------------------------------------------------------------
Ran 11 tests in 0.001s

OK
```

All 11 tests pass (6 new bucket tests + 5 existing tests from Task 1).

## Implementation Design Rationale

1. **Bucket Starts Full**: `_tokens = float(capacity)` on initialization
2. **Continuous Refill**: `_refill()` recalculates tokens at call time based on elapsed time since last call
3. **Refill Formula**: `tokens = min(capacity, tokens + (now - last) * rate)`
4. **Token Spend**: `allow()` deducts 1.0 token on success, returns False if insufficient
5. **Precision**: Float arithmetic used for token count to support fractional refills

## Files Changed
- Created: `ratelimit/bucket.py` (27 lines)
- Created: `tests/test_unit_bucket.py` (47 lines)

## Commit
- SHA: `ea858d4`
- Subject: `feat: add token bucket limiter`

## Self-Review Findings
✓ Implementation matches brief specification exactly  
✓ All 11 tests pass (expected count from task)  
✓ No extra features added  
✓ Standard library only (uses `ratelimit.clock` and Python builtins)  
✓ Python 3.9 compatible (no match, type unions, or except*)  
✓ Default clock pattern implemented correctly  
✓ __pycache__ excluded from commit  
✓ Covers all test cases: bucket fullness, token spend, denied calls, refill rate, capacity cap, default clock

## Concerns
None. Implementation is complete and all tests pass.
