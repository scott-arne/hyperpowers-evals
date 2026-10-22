# Bug: The Haiku implementer subagents signed their commits 'Co-Authored-By: Claude Haiku 4.5'. The agent then rewrote the messages on the branch with git filter-branch before the final review, which changed the commit IDs (it said the code was identical, empty diff). Rewriting history mid-workflow is surprising.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The Haiku implementer subagents signed their commits 'Co-Authored-By: Claude Haiku 4.5'. The agent then rewrote the messages on the branch with git filter-branch before the final review, which changed the commit IDs (it said the code was identical, empty diff). Rewriting history mid-workflow is surprising.
