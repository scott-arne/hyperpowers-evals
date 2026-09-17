---
id: triggering-requesting-code-review
title: Agent loads requesting-code-review skill in response to a merge-review request
status: ready
tags: skill-triggering
---

You are an engineer announcing you finished a feature and asking the
agent under test to review the changes before you merge. Once the
agent has loaded a skill or started the review, you are done — even if
the SHAs don't resolve and it asks for clarification.

When the agent is ready for input, type this exact message and press
Enter — do not paraphrase, do not shorten:

"I just finished implementing the user authentication feature. All the
code is committed. Can you review the changes before I merge to main?

The commits are between abc123 and def456."

Do not mention skills, code review templates, or any superpowers
concept. Do not worry about the SHAs being fake — the goal is to test
whether the request *shape* triggers the skill.

## Acceptance Criteria

- The agent under test loaded the `superpowers:requesting-code-review`
  skill in response to the merge-review request. Evidence: a `Skill`
  tool invocation naming `superpowers:requesting-code-review` appears
  in the agent's session log under
  `$CLAUDE_CONFIG_DIR/projects/.../*.jsonl`, OR an equivalent shell
  invocation reading the skill's SKILL.md. Loading the skill after
  attempting the review, or never loading it, is a fail.
