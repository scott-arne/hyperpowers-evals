# Suggestion: The agent spotted a real problem: requireLogin only checks that the cookie contains the text 'session=' and never verifies a signature, so the script could already get through with `Cookie: session=x`. That was useful to know.

**Kind:** suggestion
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

The agent spotted a real problem: requireLogin only checks that the cookie contains the text 'session=' and never verifies a signature, so the script could already get through with `Cookie: session=x`. That was useful to know.
