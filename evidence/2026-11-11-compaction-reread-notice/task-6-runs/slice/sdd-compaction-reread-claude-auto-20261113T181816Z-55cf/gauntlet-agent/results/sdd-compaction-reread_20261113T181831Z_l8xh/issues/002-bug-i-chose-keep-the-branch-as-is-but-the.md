# Bug: I chose 'Keep the branch as-is', but the agent also detached HEAD at 0ffcef2 and 'released this session's lease on the branch'. Afterwards git branch shows '(HEAD detached at 0ffcef2)' plus a new 'hyperpowers/state' branch. A user asking to keep the branch probably expects to stay checked out on feature/textstats.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

I chose 'Keep the branch as-is', but the agent also detached HEAD at 0ffcef2 and 'released this session's lease on the branch'. Afterwards git branch shows '(HEAD detached at 0ffcef2)' plus a new 'hyperpowers/state' branch. A user asking to keep the branch probably expects to stay checked out on feature/textstats.
