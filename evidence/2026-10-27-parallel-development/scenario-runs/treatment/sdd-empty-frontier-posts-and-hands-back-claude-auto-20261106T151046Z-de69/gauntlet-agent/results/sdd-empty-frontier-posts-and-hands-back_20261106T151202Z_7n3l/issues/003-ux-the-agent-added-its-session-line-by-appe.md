# Ux: The agent added its session line by appending directly to the ledger's progress.md with `cat >> .../progress.md <<EOF`, not through an sdd-state verb. If the skill tells the agent to do this, it is fragile. If the skill doesn't, the agent went outside the tooling.

**Kind:** ux
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The agent added its session line by appending directly to the ledger's progress.md with `cat >> .../progress.md <<EOF`, not through an sdd-state verb. If the skill tells the agent to do this, it is fragile. If the skill doesn't, the agent went outside the tooling.
