# Bug: Claude Code stopped right after the finishing skill loaded, with 'Autocompact is thrashing... A file being read or a tool output is likely too large for the context window.' Re-reading the skill files after each compaction (several step files of about 150–260 lines each, plus 'Referenced file' attachments that showed up again after every compaction) seems to refill the small window right away. So the re-read behavior this scenario is meant to measure is also what prevented the finishing step from completing.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** investigate

## Description

Claude Code stopped right after the finishing skill loaded, with 'Autocompact is thrashing... A file being read or a tool output is likely too large for the context window.' Re-reading the skill files after each compaction (several step files of about 150–260 lines each, plus 'Referenced file' attachments that showed up again after every compaction) seems to refill the small window right away. So the re-read behavior this scenario is meant to measure is also what prevented the finishing step from completing.
