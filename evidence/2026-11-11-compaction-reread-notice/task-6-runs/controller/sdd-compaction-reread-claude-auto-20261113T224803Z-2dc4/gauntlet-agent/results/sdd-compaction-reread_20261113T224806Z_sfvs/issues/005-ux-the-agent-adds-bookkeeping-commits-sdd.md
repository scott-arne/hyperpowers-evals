# Ux: The agent adds bookkeeping commits ('sdd plan: Task N complete', 'sdd plan: snapshot...') to a hyperpowers/state branch. git log --all shows them mixed in with the feature commits, which could confuse users.

**Kind:** ux
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

The agent adds bookkeeping commits ('sdd plan: Task N complete', 'sdd plan: snapshot...') to a hyperpowers/state branch. git log --all shows them mixed in with the feature commits, which could confuse users.
