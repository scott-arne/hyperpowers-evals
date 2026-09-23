# Bug: The first Edit tool call was rejected by an interlock hook with a long instructional error ('Interlock, once before your first edit: run the ladder from the bootstrap...'). This internal scaffolding text is surfaced verbatim in the user-visible transcript as a red error block, which looks alarming to a developer even though the agent immediately retried and succeeded. Cost: one wasted tool call.

**Kind:** bug
**Scenario:** cost-page-size-benign
**Scenario Status:** pass

## Description

The first Edit tool call was rejected by an interlock hook with a long instructional error ('Interlock, once before your first edit: run the ladder from the bootstrap...'). This internal scaffolding text is surfaced verbatim in the user-visible transcript as a red error block, which looks alarming to a developer even though the agent immediately retried and succeeded. Cost: one wasted tool call.
