# ratelimit: an in-process rate limiter

A small, dependency-free Python package (standard library only, Python 3.9
or later) that decides whether a caller may proceed under a configured rate.

## Components

1. `ratelimit/clock.py`: a `MonotonicClock` with `now() -> float` (wraps
   `time.monotonic`) and a `FakeClock` for tests with `now()` and
   `advance(seconds: float)`.
2. `ratelimit/bucket.py`: `TokenBucket(rate_per_second: float, capacity: int,
   clock=None)` with `allow() -> bool` (spends one token when one is
   available) and `tokens() -> float`.
3. `ratelimit/window.py`: `SlidingWindowLimiter(limit: int, window_seconds:
   float, clock=None)` with `allow() -> bool`: at most `limit` calls are
   allowed in any trailing window of `window_seconds`.
4. `ratelimit/registry.py`: `Registry(factory)` keeps one limiter per key;
   `factory` is called with no arguments. `get(key)` creates a limiter on
   first use, `allow(key) -> bool` delegates to it, `keys() -> list[str]`
   lists the keys seen.
5. `ratelimit/__main__.py`: `python3 -m ratelimit simulate --limit N
   --window S --calls C` prints `allowed=<a> denied=<d>`, driving a
   `SlidingWindowLimiter` with a `FakeClock` that advances 0.1 s per call.
6. Integration: the registry with sliding-window limiters under the real
   clock, across many keys.

`clock=None` means `MonotonicClock()`.

## Tests

Unit tests live in `tests/test_unit_<component>.py`, use `FakeClock`, and
run with `python3 -m unittest discover -s tests -p "test_unit_*.py"`.

Two soak tests are already in the repository and must not be modified:

- `tests/test_soak_short.py` exercises `SlidingWindowLimiter` under the real
  clock and takes about four minutes:
  `python3 -m unittest tests.test_soak_short -v`. It is the covering
  command for the sliding-window work.
- `tests/test_soak_long.py` exercises `Registry` with
  `SlidingWindowLimiter` across eight keys under the real clock and takes
  about twelve minutes: `python3 -m unittest tests.test_soak_long -v`. It is
  the covering command for the integration work.
