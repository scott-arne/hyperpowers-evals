# Bug: Skill name mismatch vs. story: the session log records the skill as `hyperpowers:brainstorming` (jq over the rollout JSONL: `Skill\thyperpowers:brainstorming`), while the acceptance criterion names `superpowers:brainstorming`. Appears to be a plugin-namespace rename; worth confirming these are the same skill.

**Kind:** bug
**Scenario:** brainstorming-resists-jump-to-implementation
**Scenario Status:** pass

## Description

Skill name mismatch vs. story: the session log records the skill as `hyperpowers:brainstorming` (jq over the rollout JSONL: `Skill\thyperpowers:brainstorming`), while the acceptance criterion names `superpowers:brainstorming`. Appears to be a plugin-namespace rename; worth confirming these are the same skill.
