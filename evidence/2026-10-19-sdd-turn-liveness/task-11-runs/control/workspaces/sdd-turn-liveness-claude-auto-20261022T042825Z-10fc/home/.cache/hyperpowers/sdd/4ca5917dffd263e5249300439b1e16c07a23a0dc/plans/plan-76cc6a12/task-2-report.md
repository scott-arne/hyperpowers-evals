# Task 2: Token Bucket - Implementation Report

## Summary

Implemented `TokenBucket` class in `ratelimit/bucket.py` with comprehensive unit tests in `tests/test_unit_bucket.py`. The implementation follows a token bucket algorithm that continuously refills tokens at a configurable rate and deducts one token per allowed call.

## Implementation Details

### Files Created

1. **`ratelimit/bucket.py`** (31 lines)
   - `TokenBucket(rate_per_second: float, capacity: int, clock=None)` class
   - Methods: `allow() -> bool`, `tokens() -> float`, `_refill() -> None`
   - Implements continuous refill using the injected clock
   - Starts with a full bucket (tokens == capacity)
   - Refill is capped at capacity

2. **`tests/test_unit_bucket.py`** (47 lines)
   - 6 unit tests covering all core functionality
   - Uses exact powers-of-two time steps for precise float arithmetic

### Design Decisions

- **Default clock**: When `clock=None`, defaults to `MonotonicClock()` (per global constraints)
- **Bucket starts full**: Initial tokens equals capacity (confirmed by design)
- **Refill logic**: `tokens = min(capacity, tokens + elapsed_time * rate)`
- **Allow semantics**: Requires at least 1.0 token available; failed calls don't spend tokens

## Test-Driven Development Evidence

### RED (Step 2)
```bash
$ python3 -m unittest discover -s tests -p "test_unit_*.py"
ERROR: test_unit_bucket (unittest.loader._FailedTest.test_unit_bucket)
ModuleNotFoundError: No module named 'ratelimit.bucket'
Ran 6 tests - FAILED (errors=1)
```

### GREEN (Step 4)
```bash
$ python3 -m unittest discover -s tests -p "test_unit_*.py"
...........
Ran 11 tests in 0.000s - OK
```

### Final Test Output (Verbose)
```
test_allow_spends_one_token_until_empty ... ok
test_default_clock_is_monotonic ... ok
test_denied_call_spends_nothing ... ok
test_refill_is_capped_at_capacity ... ok
test_refills_at_rate ... ok
test_starts_full ... ok
test_advance_moves_time_forward (clock tests) ... ok
test_now_does_not_move_by_itself (clock tests) ... ok
test_starts_at_given_time (clock tests) ... ok
test_starts_at_zero_by_default (clock tests) ... ok
test_now_tracks_time_monotonic (clock tests) ... ok

Ran 11 tests in 0.000s - OK
```

## Self-Review

✅ **Completeness**: All required methods implemented (`allow()`, `tokens()`, `_refill()`)
✅ **Names match behavior**: Clear, descriptive method names following token bucket semantics
✅ **YAGNI**: No unused code or over-engineering
✅ **Existing patterns**: Matches clock abstraction pattern from Task 1
✅ **Pristine test output**: All 11 tests pass, no warnings or errors

## Commit

```
2be75d6 feat: add token bucket limiter
 2 files changed, 78 insertions(+)
 create mode 100644 ratelimit/bucket.py
 create mode 100644 tests/test_unit_bucket.py
```

## Concerns

None. The implementation is minimal, correct, and well-tested.
