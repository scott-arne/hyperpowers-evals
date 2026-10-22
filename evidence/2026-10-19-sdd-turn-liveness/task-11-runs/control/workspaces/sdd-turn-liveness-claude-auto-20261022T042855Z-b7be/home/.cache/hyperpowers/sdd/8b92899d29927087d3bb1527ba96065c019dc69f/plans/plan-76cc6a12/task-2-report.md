# Task 2 Report: Token Bucket Implementation

## Implementation Summary

Implemented a token bucket rate limiter with continuous refill mechanics, following TDD approach:

1. **Created** `ratelimit/bucket.py` with `TokenBucket` class
   - Constructor accepts `rate_per_second`, `capacity`, and optional `clock` (defaults to `MonotonicClock()`)
   - Maintains internal state: `_tokens` (current tokens), `_last` (last refill time)
   - `_refill()` method updates tokens based on elapsed time and rate, capped at capacity
   - `allow()` method spends one token if available, returns boolean
   - `tokens()` method returns current token count after refill

2. **Created** `tests/test_unit_bucket.py` with 6 test cases covering:
   - Bucket starts at full capacity
   - Tokens spent one-at-a-time until empty
   - Denied calls consume no tokens
   - Refill mechanics at specified rate
   - Refill capped at capacity
   - Default clock is `MonotonicClock`

## TDD Evidence

### RED Phase (Failing Test)
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`

Output (initial failure):
```
E.....
ERROR: test_unit_bucket (unittest.loader._FailedTest.test_unit_bucket)
ImportError: Failed to import test module: test_unit_bucket
ModuleNotFoundError: No module named 'ratelimit.bucket'
Ran 6 tests in 0.000s
FAILED (errors=1)
```

Failure reason: Module `ratelimit.bucket` did not exist.

### GREEN Phase (Passing Implementation)
Command: `python3 -m unittest discover -s tests -p "test_unit_*.py"`

Output (after implementation):
```
...........
Ran 11 tests in 0.000s
OK
```

All 11 tests pass (5 existing + 6 new tests for TokenBucket).

## Files Changed

- **Created**: `ratelimit/bucket.py` (28 lines)
- **Created**: `tests/test_unit_bucket.py` (50 lines)

## Covering Test Command

```bash
python3 -m unittest discover -s tests -p "test_unit_*.py"
```

Final output:
```
...........
Ran 11 tests in 0.000s
OK
```

## Self-Review Findings

✓ Implementation exactly matches brief specification
✓ Code uses standard library only (no imports beyond stdlib and ratelimit)
✓ Python 3.9 compatible (no match, type unions, or except*)
✓ `clock=None` defaults to `MonotonicClock()` per constraints
✓ Test file name follows pattern `tests/test_unit_bucket.py`
✓ All 6 test cases verify actual behavior:
  - Initial state
  - Token consumption
  - Refusal without consumption
  - Time-based refill
  - Capacity capping
  - Clock implementation
✓ No extra features (YAGNI principle observed)
✓ No modifications to existing files or tests
✓ No unintended side effects

## Commit

```
commit f306a515cae7a9efa3f9bed73ef0e82c67037287
Author: Drill Test <drill@test.local>

feat: add token bucket limiter

 ratelimit/bucket.py       | 28 ++++++++++++++++++++++++++
 tests/test_unit_bucket.py | 50 +++++++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 78 insertions(+)
```

## Concerns

None. Implementation is complete and correct per brief specification.
