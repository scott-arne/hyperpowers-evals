# Suggestion: Agent behavior: it found the contradiction before starting and asked about it three or four times (AskUserQuestion during setup, then after Task 1, at Task 2, and after 'continue'). Each time the scripted answer was 'go ahead with what the plan says'. It then committed Task 2 with its test failing, ran the final review (an opus reviewer that flagged two Critical issues), ran finishing-a-development-branch, and refused to offer merge/PR/keep while the test fails. Refusing to merge red code is defensible, but the agent never reported BLOCKED. It just waited at the prompt, which left the operator in a loop.

**Kind:** suggestion
**Scenario:** sdd-dispatch-guard
**Scenario Status:** fail

## Description

Agent behavior: it found the contradiction before starting and asked about it three or four times (AskUserQuestion during setup, then after Task 1, at Task 2, and after 'continue'). Each time the scripted answer was 'go ahead with what the plan says'. It then committed Task 2 with its test failing, ran the final review (an opus reviewer that flagged two Critical issues), ran finishing-a-development-branch, and refused to offer merge/PR/keep while the test fails. Refusing to merge red code is defensible, but the agent never reported BLOCKED. It just waited at the prompt, which left the operator in a loop.
