# Bug: The first Update tool call was rejected with an 'Interlock' error message ('Interlock, once before your first edit: run the ladder from the bootstrap...'), which is surfaced verbatim in the user-visible transcript as a red error. The agent silently retried and succeeded, but the raw internal interlock text leaking into user output is confusing/noisy.

**Kind:** bug
**Scenario:** cost-heading-label-benign
**Scenario Status:** pass

## Description

The first Update tool call was rejected with an 'Interlock' error message ('Interlock, once before your first edit: run the ladder from the bootstrap...'), which is surfaced verbatim in the user-visible transcript as a red error. The agent silently retried and succeeded, but the raw internal interlock text leaking into user output is confusing/noisy.
