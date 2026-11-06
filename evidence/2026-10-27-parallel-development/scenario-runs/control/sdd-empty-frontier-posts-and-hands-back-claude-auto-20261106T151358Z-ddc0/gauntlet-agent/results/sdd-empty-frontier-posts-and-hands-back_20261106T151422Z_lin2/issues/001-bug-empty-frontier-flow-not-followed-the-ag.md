# Bug: Empty-frontier flow not followed. The agent never called `sdd-state next`. It went straight to `sdd-state claim` for each task, got exit code 4 / status=held, and then asked the user about a takeover instead of posting a `wait --kind tasks` record and printing the board.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

Empty-frontier flow not followed. The agent never called `sdd-state next`. It went straight to `sdd-state claim` for each task, got exit code 4 / status=held, and then asked the user about a takeover instead of posting a `wait --kind tasks` record and printing the board.
