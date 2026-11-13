# Bug: With autoCompactWindow=100000 (from .claude/settings.json) and a 27.6 KB plan.md, the controller crossed the compaction threshold during setup, before Task 1 rather than after it as the scenario expected. After each compaction it reloaded the skills ("Skills restored (using-git-worktrees, subagent-driven-development)") and read SKILL.md again, 6 times in total. That refilled the context within 3 turns each time, and Claude Code gave up with an 'Autocompact is thrashing' error. Reloading the full skill text plus the plan after each compaction appears to leave too little room in this window.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

With autoCompactWindow=100000 (from .claude/settings.json) and a 27.6 KB plan.md, the controller crossed the compaction threshold during setup, before Task 1 rather than after it as the scenario expected. After each compaction it reloaded the skills ("Skills restored (using-git-worktrees, subagent-driven-development)") and read SKILL.md again, 6 times in total. That refilled the context within 3 turns each time, and Claude Code gave up with an 'Autocompact is thrashing' error. Reloading the full skill text plus the plan after each compaction appears to leave too little room in this window.
