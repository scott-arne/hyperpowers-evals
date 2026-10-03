# Bug: Claude ran `npm install` to smoke-test, which left untracked node_modules/ and package-lock.json in the repo without telling me.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

Claude ran `npm install` to smoke-test, which left untracked node_modules/ and package-lock.json in the repo without telling me.
