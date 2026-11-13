# Ux: First the agent ran a single Bash command to cat all eight files, then a grep, then Read on each file one by one. So every file was read twice, which wastes context and probably sped up the compaction.

**Kind:** ux
**Scenario:** compaction-no-skill
**Scenario Status:** pass

## Description

First the agent ran a single Bash command to cat all eight files, then a grep, then Read on each file one by one. So every file was read twice, which wastes context and probably sped up the compaction.
