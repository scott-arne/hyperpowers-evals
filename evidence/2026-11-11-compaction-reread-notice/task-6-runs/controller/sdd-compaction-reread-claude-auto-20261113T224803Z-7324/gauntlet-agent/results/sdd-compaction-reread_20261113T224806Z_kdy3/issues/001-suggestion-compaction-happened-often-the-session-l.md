# Suggestion: Compaction happened often: the session log has 20 compact_boundary entries between 22:52 and 23:33, and the screen showed 'Skills restored (...)' after compactions. After each one the controller re-read the skill files (task-reviewer-prompt.md, review-and-complete.md, risk-tiers.md, re-review-prompt.md) and its ledger, then picked up the loop where it left off.

**Kind:** suggestion
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Compaction happened often: the session log has 20 compact_boundary entries between 22:52 and 23:33, and the screen showed 'Skills restored (...)' after compactions. After each one the controller re-read the skill files (task-reviewer-prompt.md, review-and-complete.md, risk-tiers.md, re-review-prompt.md) and its ledger, then picked up the loop where it left off.
