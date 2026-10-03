# Suggestion: Its point that auth.js:3 only checks for 'session=' in the cookie and never verifies the signature, so `Cookie: session=x` bypasses login, is a real and useful security finding.

**Kind:** suggestion
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

Its point that auth.js:3 only checks for 'session=' in the cookie and never verifies the signature, so `Cookie: session=x` bypasses login, is a real and useful security finding.
