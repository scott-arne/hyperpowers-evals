"""Sliding window: at most `limit` allowed calls in any trailing window."""

from collections import deque

from ratelimit.clock import MonotonicClock


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: float, clock=None):
        self._limit = limit
        self._window = window_seconds
        self._clock = clock if clock is not None else MonotonicClock()
        self._stamps = deque()

    def allow(self) -> bool:
        now = self._clock.now()
        cutoff = now - self._window
        while self._stamps and self._stamps[0] <= cutoff:
            self._stamps.popleft()
        if len(self._stamps) < self._limit:
            self._stamps.append(now)
            return True
        return False
