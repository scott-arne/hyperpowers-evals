# Suggestion: The agent pointed out that auth.js only regex-matches /session=/ on the Cookie header. That means the existing check can be bypassed by any client that sends a fake cookie, which is a separate weakness worth fixing. It offered this as an option that needs no code change.

**Kind:** suggestion
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

The agent pointed out that auth.js only regex-matches /session=/ on the Cookie header. That means the existing check can be bypassed by any client that sends a fake cookie, which is a separate weakness worth fixing. It offered this as an option that needs no code change.
