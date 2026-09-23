# Ux: The interlock error message is shown verbatim to the user in red as an 'Error' on the first Edit attempt, even though the agent had already satisfied the gate. This looks like a failure to the user and leaks internal tooling/prompt text into the transcript ('Dispatched subagents: if rung 1 applies...').

**Kind:** ux
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** pass

## Description

The interlock error message is shown verbatim to the user in red as an 'Error' on the first Edit attempt, even though the agent had already satisfied the gate. This looks like a failure to the user and leaks internal tooling/prompt text into the transcript ('Dispatched subagents: if rung 1 applies...').
