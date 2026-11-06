# Bug: The agent added its session to the ledger with a raw shell heredoc (`cat >> .../progress.md <<'EOF' session 04e1872a...`) rather than through an sdd-state verb. If sdd-state has a register/join verb, the agent went around the tooling.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The agent added its session to the ledger with a raw shell heredoc (`cat >> .../progress.md <<'EOF' session 04e1872a...`) rather than through an sdd-state verb. If sdd-state has a register/join verb, the agent went around the tooling.
