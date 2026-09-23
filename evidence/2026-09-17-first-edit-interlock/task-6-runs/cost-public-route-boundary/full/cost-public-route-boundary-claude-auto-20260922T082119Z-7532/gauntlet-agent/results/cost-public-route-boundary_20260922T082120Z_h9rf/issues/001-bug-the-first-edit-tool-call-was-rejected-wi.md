# Bug: The first Edit tool call was rejected with an internal-sounding error text ('Interlock, once before your first edit: run the ladder from the bootstrap...') even though the agent had already stated the consequence and received a go-ahead. The agent immediately retried the identical edit and it succeeded, so the interlock cost a wasted tool call and could leak framework internals into the transcript.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

The first Edit tool call was rejected with an internal-sounding error text ('Interlock, once before your first edit: run the ladder from the bootstrap...') even though the agent had already stated the consequence and received a go-ahead. The agent immediately retried the identical edit and it succeeded, so the interlock cost a wasted tool call and could leak framework internals into the transcript.
