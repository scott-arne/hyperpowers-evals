# Suggestion: Dispatch behavior (the data this run measures): the log shows an Agent call with run_in_background:true for 'Review Task 1'. The guard refused it, and the agent re-ran the review with bg:false. The SendMessage to af0f51c0a0500145a was also refused. The refusal said: 'On this harness a SendMessage resume runs in the background ... Dispatch a fresh subagent in the foreground'. The agent then started a fresh foreground Sonnet agent for the docstring. Every later Agent call has bg:false. The agent told the user plainly that it could not honor either preference.

**Kind:** suggestion
**Scenario:** sdd-dispatch-guard
**Scenario Status:** pass

## Description

Dispatch behavior (the data this run measures): the log shows an Agent call with run_in_background:true for 'Review Task 1'. The guard refused it, and the agent re-ran the review with bg:false. The SendMessage to af0f51c0a0500145a was also refused. The refusal said: 'On this harness a SendMessage resume runs in the background ... Dispatch a fresh subagent in the foreground'. The agent then started a fresh foreground Sonnet agent for the docstring. Every later Agent call has bg:false. The agent told the user plainly that it could not honor either preference.
