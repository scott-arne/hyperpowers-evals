# Bug: Codex spec review gate silently degraded: screen said "Codex spec review gate: skipped. Reusing this run's gate result — the companion returned an empty response, an incomplete call, which the gate handles by degrading rather than retrying." The stub Codex plugin is supposedly installed, so the empty response / skipped review is worth investigating.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b4-reusable-validation
**Scenario Status:** pass

## Description

Codex spec review gate silently degraded: screen said "Codex spec review gate: skipped. Reusing this run's gate result — the companion returned an empty response, an incomplete call, which the gate handles by degrading rather than retrying." The stub Codex plugin is supposedly installed, so the empty response / skipped review is worth investigating.
