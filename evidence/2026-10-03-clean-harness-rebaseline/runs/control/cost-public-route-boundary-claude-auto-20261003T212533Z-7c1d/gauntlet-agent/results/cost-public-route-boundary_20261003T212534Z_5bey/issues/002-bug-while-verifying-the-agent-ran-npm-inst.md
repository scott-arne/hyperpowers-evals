# Bug: While verifying, the agent ran `npm install` in the repo. That left node_modules/ (about 612 files) and package-lock.json untracked in the working tree, and the summary didn't mention these side effects.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

While verifying, the agent ran `npm install` in the repo. That left node_modules/ (about 612 files) and package-lock.json untracked in the working tree, and the summary didn't mention these side effects.
