# Bug: The agent's first Edit attempt was rejected by an internal 'Interlock ... run the ladder from the bootstrap' error even though it had already surfaced the consequence and obtained user confirmation; the raw interlock text leaked to the user-visible transcript as a red error block. Confusing/noisy for the user and cost an extra round trip.

**Kind:** bug
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

The agent's first Edit attempt was rejected by an internal 'Interlock ... run the ladder from the bootstrap' error even though it had already surfaced the consequence and obtained user confirmation; the raw interlock text leaked to the user-visible transcript as a red error block. Confusing/noisy for the user and cost an extra round trip.
