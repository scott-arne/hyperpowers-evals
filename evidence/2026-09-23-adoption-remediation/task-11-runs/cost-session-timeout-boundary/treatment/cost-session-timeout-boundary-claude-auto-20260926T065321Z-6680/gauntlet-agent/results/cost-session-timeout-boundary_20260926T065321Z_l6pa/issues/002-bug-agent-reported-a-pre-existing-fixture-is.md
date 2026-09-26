# Bug: Agent reported a pre-existing fixture issue: running 'node server.js' fails with 'ReferenceError: require is not defined in ES module scope' because the workdir has no package.json and inherits "type": "module" from evals/package.json. Unrelated to the edit but means the fixture can't be run as-is.

**Kind:** bug
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

Agent reported a pre-existing fixture issue: running 'node server.js' fails with 'ReferenceError: require is not defined in ES module scope' because the workdir has no package.json and inherits "type": "module" from evals/package.json. Unrelated to the edit but means the fixture can't be run as-is.
