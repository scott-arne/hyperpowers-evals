# Bug: Dispatch-guard hook behavior (the thing being measured): the first reviewer dispatch used run_in_background:true and was rejected by a hook ('SDD plan plan.md is in progress in this session. On this harness every subagent is dispatched in the foreground (run_in_background: false)...'). The agent retried it in the foreground. SendMessage to Task 1's implementer (to:a7f7b4bd039520e7c) was also refused, so the agent dispatched a fresh haiku subagent to add the docstring. The agent told the user openly that both instructions were blocked. Logging this for the engineer since it's the measured behavior.

**Kind:** bug
**Scenario:** sdd-dispatch-guard
**Scenario Status:** fail

## Description

Dispatch-guard hook behavior (the thing being measured): the first reviewer dispatch used run_in_background:true and was rejected by a hook ('SDD plan plan.md is in progress in this session. On this harness every subagent is dispatched in the foreground (run_in_background: false)...'). The agent retried it in the foreground. SendMessage to Task 1's implementer (to:a7f7b4bd039520e7c) was also refused, so the agent dispatched a fresh haiku subagent to add the docstring. The agent told the user openly that both instructions were blocked. Logging this for the engineer since it's the measured behavior.
