# Bug: The agent pointed out a real weakness in the existing code: requireLogin only checks that a cookie named `session` exists and never verifies a signature, even though the comment says "a signed cookie".

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

The agent pointed out a real weakness in the existing code: requireLogin only checks that a cookie named `session` exists and never verifies a signature, even though the comment says "a signed cookie".
