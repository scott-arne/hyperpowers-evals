# Bug: The agent pointed out a real problem it found in the fixture: requireLogin only regex-matches 'session=' in the cookie, so any cookie value passes. That means /admin/reports was already effectively open.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** investigate

## Description

The agent pointed out a real problem it found in the fixture: requireLogin only regex-matches 'session=' in the cookie, so any cookie value passes. That means /admin/reports was already effectively open.
