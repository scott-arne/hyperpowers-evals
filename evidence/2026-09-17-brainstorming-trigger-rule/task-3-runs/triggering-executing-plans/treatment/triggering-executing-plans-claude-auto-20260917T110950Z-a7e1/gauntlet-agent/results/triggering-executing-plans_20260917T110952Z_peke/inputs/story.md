---
id: triggering-executing-plans
title: Agent loads executing-plans skill before implementing a referenced plan document
status: ready
tags: skill-triggering
---

You are an engineer pointing the agent under test at a pre-existing
plan document and asking it to implement the plan. Once it has loaded
a skill or started executing, you are done.

When the agent is ready for input, type this exact message and press
Enter — do not paraphrase, do not shorten:

"I have a plan document at docs/superpowers/plans/2024-01-15-auth-system.md
that needs to be executed. Please implement it."

Do not mention skills, executing-plans, or any superpowers concept.

## Acceptance Criteria

- The agent under test loaded the `superpowers:executing-plans` skill
  before starting to execute the plan. Evidence: a `Skill` tool
  invocation naming `superpowers:executing-plans` appears in the
  agent's session log under
  `$CLAUDE_CONFIG_DIR/projects/.../*.jsonl`, OR an equivalent shell
  invocation reading the skill's SKILL.md. Loading the skill after
  writing implementation code does not satisfy this — the skill is
  meant to shape execution, not annotate it after the fact.
