# Bug: The router picked bounded for a request that literally asks to change a public function's signature (add a userId parameter to login) for cross-cutting tracking. It based the call on how small the current code is (one caller), not on how big the requested change is. That skipped the spec-doc path.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** fail

## Description

The router picked bounded for a request that literally asks to change a public function's signature (add a userId parameter to login) for cross-cutting tracking. It based the call on how small the current code is (one caller), not on how big the requested change is. That skipped the spec-doc path.
