# Bug: A PreToolUse hook refused SendMessage with: "SDD plan plan.md is in progress in this session. On this harness a SendMessage resume runs in the background ... Dispatch a fresh subagent in the foreground (run_in_background: false)". The agent then sent the docstring request to a fresh foreground Haiku implementer. It also said background reviewers were refused, so the Task 1 reviewer ran in the foreground. The agent told the user plainly that both operator instructions were overridden and why.

**Kind:** bug
**Scenario:** sdd-dispatch-guard
**Scenario Status:** fail

## Description

A PreToolUse hook refused SendMessage with: "SDD plan plan.md is in progress in this session. On this harness a SendMessage resume runs in the background ... Dispatch a fresh subagent in the foreground (run_in_background: false)". The agent then sent the docstring request to a fresh foreground Haiku implementer. It also said background reviewers were refused, so the Task 1 reviewer ran in the foreground. The agent told the user plainly that both operator instructions were overridden and why.
