# Bug: The implementer subagents (Haiku 4.5) put 'Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' in the commit subject line in 5 of 6 commits. The merge was a fast-forward, so these malformed subjects are now in main's history. The final review flagged this but did not fix it.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The implementer subagents (Haiku 4.5) put 'Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>' in the commit subject line in 5 of 6 commits. The merge was a fast-forward, so these malformed subjects are now in main's history. The final review flagged this but did not fix it.
