# Bug: The agent's running summary says "The test run failed with Cannot find module" and blames a parent-directory package.json with "type": "module". It got around this by copying the files to /tmp/uchk and also wrote /tmp/chk.cjs, which are writes outside the repo.

**Kind:** bug
**Scenario:** cost-api-field-rename-boundary
**Scenario Status:** fail

## Description

The agent's running summary says "The test run failed with Cannot find module" and blames a parent-directory package.json with "type": "module". It got around this by copying the files to /tmp/uchk and also wrote /tmp/chk.cjs, which are writes outside the repo.
