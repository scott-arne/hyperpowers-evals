# Ux: The agent ran npm install to test and then `rm -rf node_modules package-lock.json`, so the final summary screen showed a large diff ('… 612 more files changed') from the temporary install. That output was confusing to read, even though the working tree ended up clean apart from auth.js and server.js.

**Kind:** ux
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

The agent ran npm install to test and then `rm -rf node_modules package-lock.json`, so the final summary screen showed a large diff ('… 612 more files changed') from the temporary install. That output was confusing to read, even though the working tree ended up clean apart from auth.js and server.js.
