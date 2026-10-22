### Task 4: Registry

**Risk tier:** standard — new module that the integration soak test drives directly.

**Files:**
- Create: `ratelimit/registry.py`
- Test: `tests/test_unit_registry.py`

**Interfaces:**
- Consumes: `SlidingWindowLimiter` (Task 3) and `FakeClock` (Task 1), in tests only. `Registry` itself works with any object that has `allow() -> bool`.
- Produces: `Registry(factory)` where `factory` takes no arguments and returns a limiter; `get(key)` returns that key's limiter, creating it on first use; `allow(key) -> bool`; `keys() -> list[str]` in first-use order.

**Mirror:** `tests/test_soak_long.py:19`, the `Registry(lambda: SlidingWindowLimiter(...))` construction the unit tests copy.

- [ ] **Step 1: Write the failing test**

Create `tests/test_unit_registry.py`:

```python
"""Unit tests for ratelimit.registry."""

import unittest

from ratelimit.clock import FakeClock
from ratelimit.registry import Registry
from ratelimit.window import SlidingWindowLimiter


class RegistryTest(unittest.TestCase):
    def setUp(self):
        self.clock = FakeClock()
        self.calls = 0

        def factory():
            self.calls += 1
            return SlidingWindowLimiter(limit=1, window_seconds=1.0, clock=self.clock)

        self.registry = Registry(factory)

    def test_get_creates_limiter_once_per_key(self):
        first = self.registry.get("a")
        self.assertIs(self.registry.get("a"), first)
        self.assertEqual(self.calls, 1)

    def test_keys_start_empty(self):
        self.assertEqual(self.registry.keys(), [])

    def test_keys_lists_keys_in_first_use_order(self):
        self.registry.allow("b")
        self.registry.get("a")
        self.registry.allow("b")
        self.assertEqual(self.registry.keys(), ["b", "a"])

    def test_allow_delegates_to_the_keys_limiter(self):
        self.assertTrue(self.registry.allow("a"))
        self.assertFalse(self.registry.allow("a"))
        self.assertFalse(self.registry.get("a").allow())

    def test_keys_are_limited_independently(self):
        self.assertTrue(self.registry.allow("a"))
        self.assertTrue(self.registry.allow("b"))
        self.assertFalse(self.registry.allow("a"))
        self.clock.advance(1.0)
        self.assertTrue(self.registry.allow("a"))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py"` (under 5 seconds)
Expected: FAIL with `ModuleNotFoundError: No module named 'ratelimit.registry'`.

- [ ] **Step 3: Write minimal implementation**

Create `ratelimit/registry.py`. A plain `dict` keeps insertion order in Python 3.7+, which gives `keys()` its first-use order.

```python
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

    def keys(self) -> list[str]:
        return list(self._limiters)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m unittest discover -s tests -p "test_unit_*.py"` (under 5 seconds)
Expected: PASS, `Ran 21 tests`, `OK`.

- [ ] **Step 5: Commit**

```bash
git add ratelimit/registry.py tests/test_unit_registry.py
git commit -m "feat: add per-key limiter registry"
```

---

