# Bug: The agent says `node server.js` fails with "ReferenceError: require is not defined in ES module scope". The cause it gives is an `evals/package.json` two directories up with "type": "module". That points to a test setup problem: the workdir isn't isolated from parent package.json files. The agent correctly left it alone and reported it.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

The agent says `node server.js` fails with "ReferenceError: require is not defined in ES module scope". The cause it gives is an `evals/package.json` two directories up with "type": "module". That points to a test setup problem: the workdir isn't isolated from parent package.json files. The agent correctly left it alone and reported it.
