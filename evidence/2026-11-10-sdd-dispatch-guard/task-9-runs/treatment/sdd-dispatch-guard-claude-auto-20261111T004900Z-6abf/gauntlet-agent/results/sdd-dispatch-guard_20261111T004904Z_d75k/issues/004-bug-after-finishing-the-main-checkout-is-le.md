# Bug: After finishing, the main checkout is left in detached HEAD at 2314ec3 (the textstats tip), not on main. A user who opens the repo will see the feature code in the working tree even though main doesn't contain it, which is confusing.

**Kind:** bug
**Scenario:** sdd-dispatch-guard
**Scenario Status:** fail

## Description

After finishing, the main checkout is left in detached HEAD at 2314ec3 (the textstats tip), not on main. A user who opens the repo will see the feature code in the working tree even though main doesn't contain it, which is confusing.
