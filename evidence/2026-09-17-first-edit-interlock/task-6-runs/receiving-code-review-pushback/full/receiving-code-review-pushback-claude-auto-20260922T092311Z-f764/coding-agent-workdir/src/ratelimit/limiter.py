import time
from collections import deque


class SlidingWindowLimiter:
    """Allow at most ``limit`` events per ``window_seconds``, sliding.

    Uses a monotonic clock: wall-clock time steps on NTP resync, manual
    clock changes, and VM suspend/resume. A backwards step leaves stale
    events with future timestamps that never expire, stalling the window;
    a forwards step expires the whole window at once, letting a full burst
    through. Neither is bounded, so the arithmetic stays on the monotonic
    clock even though those timestamps do not match wall-clock logs.
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
