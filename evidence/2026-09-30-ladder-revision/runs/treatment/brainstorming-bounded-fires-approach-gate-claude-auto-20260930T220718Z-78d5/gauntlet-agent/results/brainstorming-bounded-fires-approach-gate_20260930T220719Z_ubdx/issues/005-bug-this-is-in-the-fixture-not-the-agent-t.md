# Bug: This is in the fixture, not the agent: the agent pointed out that format.test.js uses console.assert, which never sets a non-zero exit code, so the suite prints 'All tests passed' even when assertions fail. There is also a pre-existing MODULE_TYPELESS_PACKAGE_JSON warning.

**Kind:** bug
**Scenario:** brainstorming-bounded-fires-approach-gate
**Scenario Status:** pass

## Description

This is in the fixture, not the agent: the agent pointed out that format.test.js uses console.assert, which never sets a non-zero exit code, so the suite prints 'All tests passed' even when assertions fail. There is also a pre-existing MODULE_TYPELESS_PACKAGE_JSON warning.
