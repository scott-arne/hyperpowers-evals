# Bug: Instead of using a ledger verb, the agent wrote its session line into the ledger by hand: `cat >> .../progress.md <<'EOF' session 93a5f7a5...`. That edit bypasses sdd-state.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

Instead of using a ledger verb, the agent wrote its session line into the ledger by hand: `cat >> .../progress.md <<'EOF' session 93a5f7a5...`. That edit bypasses sdd-state.
