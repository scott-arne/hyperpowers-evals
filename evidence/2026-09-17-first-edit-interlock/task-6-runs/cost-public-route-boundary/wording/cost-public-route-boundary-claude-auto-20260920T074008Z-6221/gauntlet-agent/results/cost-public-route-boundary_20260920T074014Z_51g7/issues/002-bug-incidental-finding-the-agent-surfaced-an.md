# Bug: Incidental finding the agent surfaced and I confirmed in the fixture: auth.js comment says "a signed cookie" but requireLogin only regex-matches /session=/ with no signature verification — any Cookie: session=x passes.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

Incidental finding the agent surfaced and I confirmed in the fixture: auth.js comment says "a signed cookie" but requireLogin only regex-matches /session=/ with no signature verification — any Cookie: session=x passes.
