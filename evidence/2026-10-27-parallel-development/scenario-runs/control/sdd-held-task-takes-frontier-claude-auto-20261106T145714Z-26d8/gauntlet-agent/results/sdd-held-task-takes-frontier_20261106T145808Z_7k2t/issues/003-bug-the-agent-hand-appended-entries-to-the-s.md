# Bug: The agent hand-appended entries to the shared ledger progress.md with `cat >> ... <<'EOF'` (pre-flight scan table, decisions listing, waiting note). It did not use an sdd-state verb, so the ledger write bypassed the tool.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The agent hand-appended entries to the shared ledger progress.md with `cat >> ... <<'EOF'` (pre-flight scan table, decisions listing, waiting note). It did not use an sdd-state verb, so the ledger write bypassed the tool.
