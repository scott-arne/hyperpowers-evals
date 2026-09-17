# Bug: Fixture/environment issue the agent reported: an ancestor package.json in the evals repo sets "type": "module", so the CommonJS config.js/server.js fixture cannot be run with node ("require is not defined in ES module scope"). The agent burned 4 bash attempts on this and could only verify by file content.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

Fixture/environment issue the agent reported: an ancestor package.json in the evals repo sets "type": "module", so the CommonJS config.js/server.js fixture cannot be run with node ("require is not defined in ES module scope"). The agent burned 4 bash attempts on this and could only verify by file content.
