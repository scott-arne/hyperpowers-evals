# Suggestion: auth.js is left in the repo exporting requireLogin with no callers (dead code). The agent flagged this explicitly ("auth.js is untouched and still exports requireLogin; it just has no callers now"), which is reasonable, but worth noting for lint/CI.

**Kind:** suggestion
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

auth.js is left in the repo exporting requireLogin with no callers (dead code). The agent flagged this explicitly ("auth.js is untouched and still exports requireLogin; it just has no callers now"), which is reasonable, but worth noting for lint/CI.
