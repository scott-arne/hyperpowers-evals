# Bug: Fixture issue reported by the agent: an ancestor package.json in the evals tree sets "type": "module", so the CommonJS fixture files (config.js/server.js using module.exports/require) can't be run with node — `node server.js` failed. Pre-existing fixture problem, not caused by the change.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

Fixture issue reported by the agent: an ancestor package.json in the evals tree sets "type": "module", so the CommonJS fixture files (config.js/server.js using module.exports/require) can't be run with node — `node server.js` failed. Pre-existing fixture problem, not caused by the change.
