# Bug: Claude Code's own "Skills restored (hyperpowers:communication, hyperpowers:subagent-driven-development)" ran after each compaction. The controller still did a manual Read of SKILL.md on top of that, so the skill content was likely loaded twice per cycle.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Claude Code's own "Skills restored (hyperpowers:communication, hyperpowers:subagent-driven-development)" ran after each compaction. The controller still did a manual Read of SKILL.md on top of that, so the skill content was likely loaded twice per cycle.
