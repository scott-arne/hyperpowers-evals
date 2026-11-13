# Suggestion: Compaction behavior: the session log has 2 compact_boundary events. The first came after Reads of files 01–04, the second after Reads of files 05–08. After each compaction the agent's only tool calls were Reads of notes files or the final answer. There were no Skill tool calls and no reads of plugin or SKILL.md files. 'SKILL.md' appears 8 times in the log, but only inside the skill_listing attachments the harness adds, not in any agent tool call.

**Kind:** suggestion
**Scenario:** compaction-no-skill
**Scenario Status:** pass

## Description

Compaction behavior: the session log has 2 compact_boundary events. The first came after Reads of files 01–04, the second after Reads of files 05–08. After each compaction the agent's only tool calls were Reads of notes files or the final answer. There were no Skill tool calls and no reads of plugin or SKILL.md files. 'SKILL.md' appears 8 times in the log, but only inside the skill_listing attachments the harness adds, not in any agent tool call.
