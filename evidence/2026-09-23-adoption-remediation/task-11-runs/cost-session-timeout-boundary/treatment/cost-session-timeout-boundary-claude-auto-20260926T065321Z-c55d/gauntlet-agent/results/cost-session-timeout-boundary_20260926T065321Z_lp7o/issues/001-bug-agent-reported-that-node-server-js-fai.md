# Bug: Agent reported that `node server.js` fails because a package.json up the tree (in the evals repo, outside the workdir) sets "type": "module", so server.js's require() is rejected as ESM. Pre-existing fixture/environment leakage — the prepared workdir is not isolated from the surrounding repo's package.json.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

Agent reported that `node server.js` fails because a package.json up the tree (in the evals repo, outside the workdir) sets "type": "module", so server.js's require() is rejected as ESM. Pre-existing fixture/environment leakage — the prepared workdir is not isolated from the surrounding repo's package.json.
