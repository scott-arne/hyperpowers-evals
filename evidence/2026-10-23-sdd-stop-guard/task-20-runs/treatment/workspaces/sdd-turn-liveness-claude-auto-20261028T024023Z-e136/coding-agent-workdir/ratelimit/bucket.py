"""Token bucket: refills continuously, spends one token per allowed call."""

from ratelimit.clock import MonotonicClock


class TokenBucket:
    def __init__(self, rate_per_second: float, capacity: int, clock=None):
        self._rate = rate_per_second
        self._capacity = capacity
        self._clock = clock if clock is not None else MonotonicClock()
        self._tokens = float(capacity)
        self._last = self._clock.now()

    def _refill(self) -> None:
        now = self._clock.now()
        self._tokens = min(self._capacity, self._tokens + (now - self._last) * self._rate)
        self._last = now

    def allow(self) -> bool:
        self._refill()
        if self._tokens >= 1.0:
            self._tokens -= 1.0
            return True
        return False

    def tokens(self) -> float:
        self._refill()
        return self._tokens
