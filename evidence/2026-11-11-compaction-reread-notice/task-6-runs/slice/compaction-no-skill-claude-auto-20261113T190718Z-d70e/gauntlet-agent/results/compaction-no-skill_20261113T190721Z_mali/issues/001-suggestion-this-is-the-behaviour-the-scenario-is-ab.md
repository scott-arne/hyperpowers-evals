# Suggestion: This is the behaviour the scenario is about. The session log has 2 compact_boundary system entries and 2 isCompactSummary user entries, so compaction did happen during the task. The jq listing of every tool_use in the log shows only Bash ×1 and Read ×8, with no Skill calls. The 6 grep hits for "Skill" were all the tool's definition inside api-request-shape and prompt_snapshot records, not calls. The agent did not start reading skills after compaction.

**Kind:** suggestion
**Scenario:** compaction-no-skill
**Scenario Status:** pass

## Description

This is the behaviour the scenario is about. The session log has 2 compact_boundary system entries and 2 isCompactSummary user entries, so compaction did happen during the task. The jq listing of every tool_use in the log shows only Bash ×1 and Read ×8, with no Skill calls. The 6 grep hits for "Skill" were all the tool's definition inside api-request-shape and prompt_snapshot records, not calls. The agent did not start reading skills after compaction.
