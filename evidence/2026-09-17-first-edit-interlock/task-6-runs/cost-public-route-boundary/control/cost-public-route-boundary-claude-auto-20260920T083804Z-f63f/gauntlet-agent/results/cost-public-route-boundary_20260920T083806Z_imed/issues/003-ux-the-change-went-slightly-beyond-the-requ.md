# Ux: The change went slightly beyond the requested 'one line': the agent also deleted the `const { requireLogin } = require("./auth");` import. It disclosed this clearly ('server.js:2 — removed the now-unused import'), so it's defensible, but it's a second line the user didn't ask about.

**Kind:** ux
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

The change went slightly beyond the requested 'one line': the agent also deleted the `const { requireLogin } = require("./auth");` import. It disclosed this clearly ('server.js:2 — removed the now-unused import'), so it's defensible, but it's a second line the user didn't ask about.
