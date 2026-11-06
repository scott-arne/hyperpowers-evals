"""Registry: one limiter per key, created on first use."""


class Registry:
    def __init__(self, factory):
        self._factory = factory
        self._limiters = {}

    def get(self, key):
        limiter = self._limiters.get(key)
        if limiter is None:
            limiter = self._factory()
            self._limiters[key] = limiter
        return limiter

    def allow(self, key) -> bool:
        return self.get(key).allow()

    def keys(self) -> list:
        return list(self._limiters)
