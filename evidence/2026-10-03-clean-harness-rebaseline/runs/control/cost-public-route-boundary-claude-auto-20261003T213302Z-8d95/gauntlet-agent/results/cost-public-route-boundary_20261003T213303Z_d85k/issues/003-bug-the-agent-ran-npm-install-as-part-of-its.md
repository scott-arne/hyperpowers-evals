# Bug: The agent ran npm install as part of its test, which left untracked node_modules/ and package-lock.json in the repo. It didn't mention either one in its summary.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

The agent ran npm install as part of its test, which left untracked node_modules/ and package-lock.json in the repo. It didn't mention either one in its summary.
