import time
from collections import deque


class SlidingWindowLimiter:
    """Allow at most ``limit`` events per ``window_seconds``, sliding.

    Uses a monotonic clock: wall-clock time jumps on NTP sync and DST
    transitions, which would let bursts through (or stall the window)
    if event timestamps could move backwards or leap forwards.
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
