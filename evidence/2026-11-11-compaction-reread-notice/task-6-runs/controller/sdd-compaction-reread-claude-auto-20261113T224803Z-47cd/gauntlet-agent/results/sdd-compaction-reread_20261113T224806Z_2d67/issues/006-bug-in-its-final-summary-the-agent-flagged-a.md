# Bug: In its final summary the agent flagged a possible spec issue: sentenceCount('I live on Main St. It is nice.') returns 1, because plan.md:199 treats 'St.' as an abbreviation. It also said the plan's Completion section still says 32 tests when there are 39. Both come from the fixture plan, not the controller.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

In its final summary the agent flagged a possible spec issue: sentenceCount('I live on Main St. It is nice.') returns 1, because plan.md:199 treats 'St.' as an abbreviation. It also said the plan's Completion section still says 32 tests when there are 39. Both come from the fixture plan, not the controller.
