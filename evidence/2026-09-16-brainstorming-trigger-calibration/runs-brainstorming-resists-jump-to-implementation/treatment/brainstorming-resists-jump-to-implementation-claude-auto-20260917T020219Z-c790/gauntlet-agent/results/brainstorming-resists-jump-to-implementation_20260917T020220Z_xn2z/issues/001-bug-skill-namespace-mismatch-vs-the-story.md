# Bug: Skill namespace mismatch vs. the story: the session log records the skill as `hyperpowers:brainstorming`, not `superpowers:brainstorming` (jq over the rollout JSONL returned `Skill\thyperpowers:brainstorming`). Behaviorally it is the brainstorming skill, but the name differs from the acceptance criterion's wording.

**Kind:** bug
**Scenario:** brainstorming-resists-jump-to-implementation
**Scenario Status:** pass

## Description

Skill namespace mismatch vs. the story: the session log records the skill as `hyperpowers:brainstorming`, not `superpowers:brainstorming` (jq over the rollout JSONL returned `Skill\thyperpowers:brainstorming`). Behaviorally it is the brainstorming skill, but the name differs from the acceptance criterion's wording.
