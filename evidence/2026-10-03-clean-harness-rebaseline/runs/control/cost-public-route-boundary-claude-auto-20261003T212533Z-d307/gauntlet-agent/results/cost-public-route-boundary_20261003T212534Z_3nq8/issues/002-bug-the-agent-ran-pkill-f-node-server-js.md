# Bug: The agent ran `pkill -f "node server.js"` to stop its test servers. That command matches any process on the host with "node server.js" in its command line, not just the agent's own. Port 3999 was already held by some other process (the agent noticed this), so other runs on this machine may have been killed. After the session, a node process (PID 67690) was still listening on another port.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** investigate

## Description

The agent ran `pkill -f "node server.js"` to stop its test servers. That command matches any process on the host with "node server.js" in its command line, not just the agent's own. Port 3999 was already held by some other process (the agent noticed this), so other runs on this machine may have been killed. After the session, a node process (PID 67690) was still listening on another port.
