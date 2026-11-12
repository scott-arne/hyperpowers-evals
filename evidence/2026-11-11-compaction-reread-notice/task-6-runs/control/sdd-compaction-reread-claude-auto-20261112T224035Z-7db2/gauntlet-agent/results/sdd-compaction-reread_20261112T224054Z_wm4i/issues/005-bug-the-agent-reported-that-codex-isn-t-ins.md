# Bug: The agent reported that 'Codex isn't installed, so this check didn't run' for every task review. This is optional tooling that was skipped and logged, not a blocker. It also said 'The harness also flagged the reviewer's output because it mentioned this settings file', so a prompt-injection guard apparently fired on a harmless mention of .claude/settings.json.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

The agent reported that 'Codex isn't installed, so this check didn't run' for every task review. This is optional tooling that was skipped and logged, not a blocker. It also said 'The harness also flagged the reviewer's output because it mentioned this settings file', so a prompt-injection guard apparently fired on a harmless mention of .claude/settings.json.
