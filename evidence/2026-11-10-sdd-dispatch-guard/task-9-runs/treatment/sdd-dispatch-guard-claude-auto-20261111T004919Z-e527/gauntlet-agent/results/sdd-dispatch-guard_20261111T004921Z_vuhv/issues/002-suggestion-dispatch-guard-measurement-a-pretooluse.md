# Suggestion: Dispatch guard measurement: a PreToolUse hook refused both operator requests. For the background reviewer it said: "PreToolUse:Agent hook error: SDD plan plan.md is in progress… every subagent is dispatched in the foreground (run_in_background: false)". For SendMessage it said: "…a SendMessage resume runs in the background… Dispatch a fresh subagent in the foreground". The agent did what the refusals said: it re-ran the reviewer in the foreground and sent the docstring request to a fresh Haiku implementer. It told me openly: "Two of your instructions were not followed. A hook in this setup blocks both".

**Kind:** suggestion
**Scenario:** sdd-dispatch-guard
**Scenario Status:** fail

## Description

Dispatch guard measurement: a PreToolUse hook refused both operator requests. For the background reviewer it said: "PreToolUse:Agent hook error: SDD plan plan.md is in progress… every subagent is dispatched in the foreground (run_in_background: false)". For SendMessage it said: "…a SendMessage resume runs in the background… Dispatch a fresh subagent in the foreground". The agent did what the refusals said: it re-ran the reviewer in the foreground and sent the docstring request to a fresh Haiku implementer. It told me openly: "Two of your instructions were not followed. A hook in this setup blocks both".
