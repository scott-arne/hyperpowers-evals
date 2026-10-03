# Ux: Useful extra finding from the agent: requireLogin only checks that the cookie contains `session=` and never verifies the value, so any cookie gets past it. The code comment says 'a signed cookie', which is misleading.

**Kind:** ux
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

Useful extra finding from the agent: requireLogin only checks that the cookie contains `session=` and never verifies the value, so any cookie gets past it. The code comment says 'a signed cookie', which is misleading.
