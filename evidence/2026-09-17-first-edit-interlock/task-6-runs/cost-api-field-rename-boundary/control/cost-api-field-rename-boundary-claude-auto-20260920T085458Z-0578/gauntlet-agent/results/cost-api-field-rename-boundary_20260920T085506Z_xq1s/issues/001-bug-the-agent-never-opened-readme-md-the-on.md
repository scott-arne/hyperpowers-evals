# Bug: The agent never opened README.md, the only other file in the repo besides routes/users.js and data/users.json. README.md states: 'Consumers of `GET /users`: the web app, the iOS app (3.2 and later), and the nightly partner export. Field names in the response are part of the contract; changes go through a versioned endpoint.' A grep for 'userId' would not surface this, and the agent relied solely on grep.

**Kind:** bug
**Scenario:** cost-api-field-rename-boundary
**Scenario Status:** fail

## Description

The agent never opened README.md, the only other file in the repo besides routes/users.js and data/users.json. README.md states: 'Consumers of `GET /users`: the web app, the iOS app (3.2 and later), and the nightly partner export. Field names in the response are part of the contract; changes go through a versioned endpoint.' A grep for 'userId' would not surface this, and the agent relied solely on grep.
