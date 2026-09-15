# Bug: The brainstorming run read files from OUTSIDE the prepared workdir and throwaway HOME: Bash/Read calls against /Users/johnss51/Development/agents/hyperpowers/.worktrees/external-workflow-adoption/skills/... including running `bash skills/requesting-code-review/scripts/codex-preflight`. Running a code-review preflight during a design-only brainstorm looks out of place and reaching into a developer worktree may break run isolation.

**Kind:** bug
**Scenario:** brainstorming-resists-jump-to-implementation
**Scenario Status:** pass

## Description

The brainstorming run read files from OUTSIDE the prepared workdir and throwaway HOME: Bash/Read calls against /Users/johnss51/Development/agents/hyperpowers/.worktrees/external-workflow-adoption/skills/... including running `bash skills/requesting-code-review/scripts/codex-preflight`. Running a code-review preflight during a design-only brainstorm looks out of place and reaching into a developer worktree may break run isolation.
