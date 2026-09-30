# Bug: The agent itself noticed that format.test.js prints "All tests passed" unconditionally, because console.assert does not exit non-zero. This is a pre-existing problem in the fixture, and the agent left it alone.

**Kind:** bug
**Scenario:** brainstorming-bounded-fires-approach-gate
**Scenario Status:** pass

## Description

The agent itself noticed that format.test.js prints "All tests passed" unconditionally, because console.assert does not exit non-zero. This is a pre-existing problem in the fixture, and the agent left it alone.
