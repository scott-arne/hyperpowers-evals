# Suggestion: Session log: compaction happened twice (two 'compact_boundary' system entries). After each one, a hook added context telling the agent to 'Read in full .../skills/<name>/SKILL.md for each hyperpowers skill you are following'. I listed every tool_use in the log. They were Bash cat/grep/ls, then Read on notes/01–08. There was no Skill call and no Read of any SKILL.md. The 'Skill' matches in the log are only tool definitions in prompt_snapshot and api-request-shape entries. So the agent behaved as this scenario intends.

**Kind:** suggestion
**Scenario:** compaction-no-skill
**Scenario Status:** pass

## Description

Session log: compaction happened twice (two 'compact_boundary' system entries). After each one, a hook added context telling the agent to 'Read in full .../skills/<name>/SKILL.md for each hyperpowers skill you are following'. I listed every tool_use in the log. They were Bash cat/grep/ls, then Read on notes/01–08. There was no Skill call and no Read of any SKILL.md. The 'Skill' matches in the log are only tool definitions in prompt_snapshot and api-request-shape entries. So the agent behaved as this scenario intends.
