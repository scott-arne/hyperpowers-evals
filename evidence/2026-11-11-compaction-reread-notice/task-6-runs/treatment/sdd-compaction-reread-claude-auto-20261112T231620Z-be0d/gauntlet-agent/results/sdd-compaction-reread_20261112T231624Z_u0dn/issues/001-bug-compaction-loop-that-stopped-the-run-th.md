# Bug: Compaction loop that stopped the run: the log has 3 auto compact_boundary events (preTokens 69249→postTokens 15286, then 66847→14977, then 66296→14995). After each one the controller said "Re-reading the SDD skill in full, plus the ledger and git log, before going further" and issued several Read calls on SKILL.md (some full, some with an offset) plus cat calls on ledger/plan files. That refilled the context to the threshold right away, and Claude Code stopped the turn. Re-reading after compaction undoes the compaction when the skill and plan are this large (plan.md is 27.6KB; autoCompactWindow is 100000).

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction loop that stopped the run: the log has 3 auto compact_boundary events (preTokens 69249→postTokens 15286, then 66847→14977, then 66296→14995). After each one the controller said "Re-reading the SDD skill in full, plus the ledger and git log, before going further" and issued several Read calls on SKILL.md (some full, some with an offset) plus cat calls on ledger/plan files. That refilled the context to the threshold right away, and Claude Code stopped the turn. Re-reading after compaction undoes the compaction when the skill and plan are this large (plan.md is 27.6KB; autoCompactWindow is 100000).
