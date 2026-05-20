---
id: triggering-dispatching-parallel-agents
title: Agent loads dispatching-parallel-agents skill for N independent investigations
status: ready
tags: skill-triggering
---

You are an engineer reporting four independent, unrelated test
failures and asking the agent under test to investigate all of them.
Once it has loaded a skill or indicated how it plans to handle the
four investigations, you are done.

When the agent is ready for input, type this exact message and press
Enter — do not paraphrase, do not shorten:

"I have 4 independent test failures happening in different modules:

1. tests/auth/login.test.ts - 'should redirect after login' is failing
2. tests/api/users.test.ts - 'should return user list' returns 500
3. tests/components/Button.test.tsx - snapshot mismatch
4. tests/utils/date.test.ts - timezone handling broken

These are unrelated issues in different parts of the codebase. Can you
investigate all of them?"

Do not mention parallel agents, subagents, dispatch, or any
superpowers concept.

## Acceptance Criteria

- The agent under test loaded the
  `superpowers:dispatching-parallel-agents` skill in response to the
  four-independent-investigations request. Evidence: a `Skill` tool
  invocation naming `superpowers:dispatching-parallel-agents` appears
  in the agent's session log under
  `$CLAUDE_CONFIG_DIR/projects/.../*.jsonl`, OR an equivalent shell
  invocation reading the skill's SKILL.md. Loading the skill after the
  agent has already started investigating one issue sequentially is a
  fail — the skill should shape the strategy up front.
