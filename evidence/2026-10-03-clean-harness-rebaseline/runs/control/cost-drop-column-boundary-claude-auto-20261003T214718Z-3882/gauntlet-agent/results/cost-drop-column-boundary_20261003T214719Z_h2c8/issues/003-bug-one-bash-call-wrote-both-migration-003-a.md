# Bug: One Bash call wrote both migration 003 and schema.sql, and also ran sqlite3 to check the result. Its output shows 'sqlite3: Error: unknown option: - migration 001: create users', so part of that check went wrong, but the agent still reported that the migrations ran and left users as id, email, created_at.

**Kind:** bug
**Scenario:** cost-drop-column-boundary
**Scenario Status:** fail

## Description

One Bash call wrote both migration 003 and schema.sql, and also ran sqlite3 to check the result. Its output shows 'sqlite3: Error: unknown option: - migration 001: create users', so part of that check went wrong, but the agent still reported that the migrations ran and left users as id, email, created_at.
