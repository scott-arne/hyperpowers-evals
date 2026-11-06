# Suggestion: The session log moved to a new project directory when EnterWorktree changed the cwd. That directory name starts with '-', which breaks naive `ls`/`jq` calls in log-watching tools.

**Kind:** suggestion
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The session log moved to a new project directory when EnterWorktree changed the cwd. That directory name starts with '-', which breaks naive `ls`/`jq` calls in log-watching tools.
