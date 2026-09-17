# Bug: Stray text "/codex:setup" appeared at the top of one of Claude's design messages, immediately before "--- Design — Section 1 of 3". It looks like an internal slash-command/hook artifact leaking into user-visible output. The session log shows a preceding `command -v codex 2>/dev/null || echo NO_CODEX` bash call and reads of skills/requesting-code-review, so some external-tool integration appears to be surfacing its plumbing.

**Kind:** bug
**Scenario:** brainstorming-resists-jump-to-implementation
**Scenario Status:** pass

## Description

Stray text "/codex:setup" appeared at the top of one of Claude's design messages, immediately before "--- Design — Section 1 of 3". It looks like an internal slash-command/hook artifact leaking into user-visible output. The session log shows a preceding `command -v codex 2>/dev/null || echo NO_CODEX` bash call and reads of skills/requesting-code-review, so some external-tool integration appears to be surfacing its plumbing.
