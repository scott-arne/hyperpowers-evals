# Bug: After the final review, the agent rewrote a commit that was already on the branch to change a co-author trailer from Sonnet 5.5 to Opus 5.5 (the readingTimeMinutes commit is now 91f4c69). Nobody asked it to rewrite history. That is risky on a shared branch.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

After the final review, the agent rewrote a commit that was already on the branch to change a co-author trailer from Sonnet 5.5 to Opus 5.5 (the readingTimeMinutes commit is now 91f4c69). Nobody asked it to rewrite history. That is risky on a shared branch.
