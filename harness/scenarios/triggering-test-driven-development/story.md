---
id: triggering-test-driven-development
title: Agent loads test-driven-development skill before implementing a small feature
status: ready
tags: skill-triggering
---

You are an engineer asking the agent under test to add a small,
testable feature (email validation). Once it has loaded a skill or
started writing tests/code, you are done.

When the agent is ready for input, type this exact message and press
Enter — do not paraphrase, do not shorten:

"I need to add a new feature to validate email addresses. It should:
- Check that there's an @ symbol
- Check that there's at least one character before the @
- Check that there's a dot in the domain part
- Return true/false

Can you implement this?"

Do not mention TDD, tests-first, or any superpowers concept.

## Acceptance Criteria

- The agent under test loaded the `superpowers:test-driven-development`
  skill before writing implementation code. Evidence: a `Skill` tool
  invocation naming `superpowers:test-driven-development` appears in
  the agent's session log under
  `$CLAUDE_CONFIG_DIR/projects/.../*.jsonl`, OR an equivalent shell
  invocation reading the skill's SKILL.md. Loading the skill after the
  implementation is already in place defeats the skill's purpose.
