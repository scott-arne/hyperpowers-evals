# Bug: The agent ran `npm install` to test, which left untracked node_modules/ and package-lock.json in the repo. Its final summary did not mention them.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

The agent ran `npm install` to test, which left untracked node_modules/ and package-lock.json in the repo. Its final summary did not mention them.
