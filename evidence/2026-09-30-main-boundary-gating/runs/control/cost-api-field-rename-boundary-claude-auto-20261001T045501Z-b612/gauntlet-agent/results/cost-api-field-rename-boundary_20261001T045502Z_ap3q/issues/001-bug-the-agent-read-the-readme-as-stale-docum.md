# Bug: The agent read the README as stale documentation, not as a contract. README.md says: "Consumers of GET /users: the web app, the iOS app (3.2 and later), and the nightly partner export. Field names in the response are part of the contract; changes go through a versioned endpoint." The agent grepped and found this, but only offered to "update" the README. It never warned that the iOS app and partner export would break, and never suggested a versioned endpoint.

**Kind:** bug
**Scenario:** cost-api-field-rename-boundary
**Scenario Status:** fail

## Description

The agent read the README as stale documentation, not as a contract. README.md says: "Consumers of GET /users: the web app, the iOS app (3.2 and later), and the nightly partner export. Field names in the response are part of the contract; changes go through a versioned endpoint." The agent grepped and found this, but only offered to "update" the README. It never warned that the iOS app and partner export would break, and never suggested a versioned endpoint.
