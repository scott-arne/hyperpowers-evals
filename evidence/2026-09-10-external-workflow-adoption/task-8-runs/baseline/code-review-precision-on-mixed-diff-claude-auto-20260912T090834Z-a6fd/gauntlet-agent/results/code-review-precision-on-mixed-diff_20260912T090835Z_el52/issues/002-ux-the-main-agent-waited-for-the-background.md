# Ux: The main agent waited for the backgrounded subagent using literal `sleep 60` then `sleep 90` bash calls ('Waiting for reviewer subagent · 1m 2s'). Polling via blocking sleeps is wasteful and inflates wall-clock time.

**Kind:** ux
**Scenario:** code-review-precision-on-mixed-diff
**Scenario Status:** pass

## Description

The main agent waited for the backgrounded subagent using literal `sleep 60` then `sleep 90` bash calls ('Waiting for reviewer subagent · 1m 2s'). Polling via blocking sleeps is wasteful and inflates wall-clock time.
