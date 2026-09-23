# Bug: Fixture/product note: the planted docstring in limiter.py claimed DST transitions affect wall-clock time; the agent correctly flagged this as inaccurate (time.time() is UTC epoch) and rewrote it.

**Kind:** bug
**Scenario:** receiving-code-review-pushback
**Scenario Status:** pass

## Description

Fixture/product note: the planted docstring in limiter.py claimed DST transitions affect wall-clock time; the agent correctly flagged this as inaccurate (time.time() is UTC epoch) and rewrote it.
