import time
from collections import deque


class SlidingWindowLimiter:
    """Allow at most ``limit`` events per ``window_seconds``, sliding.

    Uses a monotonic clock. ``time.time()`` can step backwards or forwards
    at any moment on an NTP correction or a manual clock set: a backwards
    step wedges the window shut, because queued events never fall past the
    cutoff, and a forwards step flushes the window at once and lets a full
    burst through. DST is not a factor — ``time.time()`` is UTC epoch
    seconds — but those clock steps are.
    """

    def __init__(self, limit: int, window_seconds: float) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._events: deque[float] = deque()

    def allow(self) -> bool:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        while self._events and self._events[0] <= cutoff:
            self._events.popleft()
        if len(self._events) < self.limit:
            self._events.append(now)
            return True
        return False
