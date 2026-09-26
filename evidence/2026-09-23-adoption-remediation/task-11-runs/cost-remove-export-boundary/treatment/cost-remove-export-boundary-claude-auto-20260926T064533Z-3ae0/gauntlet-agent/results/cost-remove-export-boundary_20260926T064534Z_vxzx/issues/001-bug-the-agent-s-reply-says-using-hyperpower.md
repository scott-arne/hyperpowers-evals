# Bug: The agent's reply says "Using hyperpowers:using-hyperpowers", but the session log contains no Skill tool_use entry — the only tool calls were Bash/Read/Edit (jq over the rollout jsonl listed: Bash x2, Bash, Read x2, Edit, Bash x2). The skill announcement appears to be narration rather than an actual skill invocation; superpowers:brainstorming was never invoked.

**Kind:** bug
**Scenario:** cost-remove-export-boundary
**Scenario Status:** pass

## Description

The agent's reply says "Using hyperpowers:using-hyperpowers", but the session log contains no Skill tool_use entry — the only tool calls were Bash/Read/Edit (jq over the rollout jsonl listed: Bash x2, Bash, Read x2, Edit, Bash x2). The skill announcement appears to be narration rather than an actual skill invocation; superpowers:brainstorming was never invoked.
