# Ux: After I had already given explicit confirmation ('make it 2 hours instead'), the first Edit tool call still returned the interlock error block demanding the ladder be run before the first edit. The agent silently retried and succeeded, but the raw interlock error text is exposed in the transcript and reads as an internal-mechanism leak to a user.

**Kind:** ux
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

After I had already given explicit confirmation ('make it 2 hours instead'), the first Edit tool call still returned the interlock error block demanding the ladder be run before the first edit. The agent silently retried and succeeded, but the raw interlock error text is exposed in the transcript and reads as an internal-mechanism leak to a user.
