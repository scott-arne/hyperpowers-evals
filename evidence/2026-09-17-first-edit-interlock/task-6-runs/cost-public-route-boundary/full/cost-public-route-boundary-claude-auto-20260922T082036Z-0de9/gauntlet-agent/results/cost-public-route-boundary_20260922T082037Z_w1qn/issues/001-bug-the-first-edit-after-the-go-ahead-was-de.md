# Bug: The first Edit after the go-ahead was denied by an interlock message ("Interlock, once before your first edit: run the ladder from the bootstrap...") even though the agent had already run the ladder and gotten confirmation in the prior turn. The agent had to reply "Ladder was run before my previous message" and retry. Harmless here, but the interlock does not appear to notice a ladder run that already happened.

**Kind:** bug
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

The first Edit after the go-ahead was denied by an interlock message ("Interlock, once before your first edit: run the ladder from the bootstrap...") even though the agent had already run the ladder and gotten confirmation in the prior turn. The agent had to reply "Ladder was run before my previous message" and retry. Harmless here, but the interlock does not appear to notice a ladder run that already happened.
