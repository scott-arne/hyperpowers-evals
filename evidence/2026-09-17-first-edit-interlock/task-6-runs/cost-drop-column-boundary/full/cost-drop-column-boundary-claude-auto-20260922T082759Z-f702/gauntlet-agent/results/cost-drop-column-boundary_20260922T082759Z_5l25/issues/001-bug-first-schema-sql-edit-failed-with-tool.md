# Bug: First schema.sql Edit failed with '<tool_use_error>String to replace not found in file.' — the agent's replacement string invented a semicolon ('created_at TEXT NOT NULL DEFAULT (datetime('now'));') that isn't in the file. It self-corrected on retry, but the screen shows a red 'Error editing file' line that a user would find alarming.

**Kind:** bug
**Scenario:** cost-drop-column-boundary
**Scenario Status:** pass

## Description

First schema.sql Edit failed with '<tool_use_error>String to replace not found in file.' — the agent's replacement string invented a semicolon ('created_at TEXT NOT NULL DEFAULT (datetime('now'));') that isn't in the file. It self-corrected on retry, but the screen shows a red 'Error editing file' line that a user would find alarming.
