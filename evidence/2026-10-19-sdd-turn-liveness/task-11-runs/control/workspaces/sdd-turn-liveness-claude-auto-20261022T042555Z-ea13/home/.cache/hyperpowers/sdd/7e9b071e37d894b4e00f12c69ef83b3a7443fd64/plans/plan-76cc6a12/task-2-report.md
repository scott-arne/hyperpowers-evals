# Task 2: Token Bucket - Report

## Implementation Summary

Implemented a `TokenBucket` class that performs continuous refill rate limiting:
- Bucket starts full at capacity
- Each `allow()` call refills based on elapsed time and spends one token (if available)
- Refill amount: `(now - last_update_time) * rate_per_second`, capped at capacity
- Uses `MonotonicClock` by default; accepts custom clock for testing
- Both `allow()` and `tokens()` calls trigger refill before returning

## TDD Evidence

### RED (Failing Test)
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`

Output:
```
E.....
======================================================================
ERROR: test_unit_bucket (unittest.loader._FailedTest.test_unit_bucket)
----------------------------------------------------------------------
ImportError: Failed to import test module: test_unit_bucket
Traceback (most recent call last):
  ...
  File "/Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/sdd-turn-liveness/results/workspaces/sdd-turn-liveness-claude-auto-20261022T042555Z-ea13/coding-agent-workdir/.claude/worktrees/ratelimit/tests/test_unit_bucket.py", line 5, in <module>
    from ratelimit.bucket import TokenBucket
ModuleNotFoundError: No module named 'ratelimit.bucket'. Did you mean: 'ratelimit.clock'?

Ran 6 tests in 0.000s

FAILED (errors=1)
```

**Why expected:** The test file tries to import `TokenBucket` from `ratelimit.bucket` which didn't exist yet.

### GREEN (Passing Tests)
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`

Output:
```
...........
----------------------------------------------------------------------
Ran 11 tests in 0.000s

OK
```

**Result:** All 11 tests pass (6 existing soak/unit tests + 5 new unit tests for TokenBucket).

## Files Changed

- **Created: `ratelimit/bucket.py`** (28 lines)
  - `TokenBucket` class with rate limiting via continuous refill
  - `__init__` initializes with rate, capacity, clock, and full token state
  - `_refill()` updates tokens based on elapsed time and rate
  - `allow()` spends one token if available, returns True/False
  - `tokens()` returns current token count after refill

- **Created: `tests/test_unit_bucket.py`** (50 lines)
  - 6 test cases covering all behaviors:
    - Starts at full capacity
    - Spends tokens one-at-a-time until empty
    - Failed calls don't spend tokens
    - Tokens refill at specified rate
    - Refill is capped at capacity
    - Default clock is MonotonicClock

## Commit

**SHA:** `00053aab0ca090c6e088ce923f32fbd3ca37bc20`  
**Message:** `feat: add token bucket limiter`

Commit includes proper attribution line per requirements.

## Self-Review

**Completeness:** ✓
- All 6 test cases from brief implemented
- Both required files created
- Implementation matches exact code from brief
- All 11 tests pass (5 new tests in test_unit_bucket.py + 6 existing tests)

**Code Quality:** ✓
- Arithmetic is exact (floating point precision maintained via time powers-of-two in tests)
- Refill logic correctly implements: `min(capacity, tokens + elapsed * rate)`
- Token spending is atomic per allow() call
- Clock abstraction properly used with sensible default

**Staging:** ✓
- Only staged the two required files (no __pycache__ included)
- No other unrelated changes

**No concerns identified.**
