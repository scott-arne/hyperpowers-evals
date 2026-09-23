# Ux: The interlock error text is exposed raw in the transcript ("Error: Interlock, once before your first edit: run the ladder from the bootstrap...") — it reads like an internal system message/stack-trace-ish failure to an end user, even though the agent had already done the right thing. Slightly confusing to see a red Error on a correctly-gated flow.

**Kind:** ux
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

The interlock error text is exposed raw in the transcript ("Error: Interlock, once before your first edit: run the ladder from the bootstrap...") — it reads like an internal system message/stack-trace-ish failure to an end user, even though the agent had already done the right thing. Slightly confusing to see a red Error on a correctly-gated flow.
