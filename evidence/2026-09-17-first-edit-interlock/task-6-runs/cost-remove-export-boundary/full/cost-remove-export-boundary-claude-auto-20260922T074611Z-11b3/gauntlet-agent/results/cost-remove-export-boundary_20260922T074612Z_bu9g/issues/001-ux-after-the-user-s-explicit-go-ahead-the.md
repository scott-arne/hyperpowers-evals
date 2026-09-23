# Ux: After the user's explicit go-ahead, the agent's first Edit call still returned a red interlock Error block ('Interlock, once before your first edit: run the ladder from the bootstrap...'). It retried successfully, but the raw guardrail text is shown to the user as an error and is verbose/jargon-y ('run the ladder from the bootstrap', 'Rung 1', 'Dispatched subagents'), which is confusing in a user-facing transcript.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

After the user's explicit go-ahead, the agent's first Edit call still returned a red interlock Error block ('Interlock, once before your first edit: run the ladder from the bootstrap...'). It retried successfully, but the raw guardrail text is shown to the user as an error and is verbose/jargon-y ('run the ladder from the bootstrap', 'Rung 1', 'Dispatched subagents'), which is confusing in a user-facing transcript.
