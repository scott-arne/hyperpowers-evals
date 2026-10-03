# Bug: Its server smoke tests on ports 3999 and 38517 reportedly failed with "port already in use", so it fell back to calling the middleware directly. Something unrelated was also listening on port 3000 (node PID 67690). The background `node server.js &` processes the agent started may have been left behind.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

Its server smoke tests on ports 3999 and 38517 reportedly failed with "port already in use", so it fell back to calling the middleware directly. Something unrelated was also listening on port 3000 (node PID 67690). The background `node server.js &` processes the agent started may have been left behind.
