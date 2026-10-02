# Bug: An auto-compaction happened between loading the skill and the first question: "Skills restored (hyperpowers:brainstorming)" after the agent read about 105KB of guideline output in chunks. The session log has one compact_boundary. The companion behavior may get lost when the skill is restored after compaction, which is the condition this scenario targets.

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** fail

## Description

An auto-compaction happened between loading the skill and the first question: "Skills restored (hyperpowers:brainstorming)" after the agent read about 105KB of guideline output in chunks. The session log has one compact_boundary. The companion behavior may get lost when the skill is restored after compaction, which is the condition this scenario targets.
