from ratelimit.limiter import SlidingWindowLimiter


def test_allows_up_to_limit():
    lim = SlidingWindowLimiter(limit=3, window_seconds=60)
    assert lim.allow() and lim.allow() and lim.allow()


def test_does_not_exceed_limit():
    lim = SlidingWindowLimiter(limit=3, window_seconds=60)
    allowed = [lim.allow() for _ in range(5)]
    assert allowed.count(True) == 3
