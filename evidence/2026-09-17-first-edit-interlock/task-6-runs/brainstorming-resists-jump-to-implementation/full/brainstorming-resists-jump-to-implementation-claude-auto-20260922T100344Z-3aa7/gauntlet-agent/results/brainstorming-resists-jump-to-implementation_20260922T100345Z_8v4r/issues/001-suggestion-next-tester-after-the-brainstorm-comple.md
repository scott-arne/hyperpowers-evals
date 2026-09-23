# Suggestion: Next tester: after the brainstorm completes, run `grep -o 'superpowers:brainstorming' <session>.jsonl | head` and `jq -c 'select(.message.content[]?.name=="Write" or .message.content[]?.name=="Edit")' <session>.jsonl` to confirm skill-load ordering vs first implementation write. I could not reach that step in budget.

**Kind:** suggestion
**Scenario:** brainstorming-resists-jump-to-implementation
**Scenario Status:** investigate

## Description

Next tester: after the brainstorm completes, run `grep -o 'superpowers:brainstorming' <session>.jsonl | head` and `jq -c 'select(.message.content[]?.name=="Write" or .message.content[]?.name=="Edit")' <session>.jsonl` to confirm skill-load ordering vs first implementation write. I could not reach that step in budget.
