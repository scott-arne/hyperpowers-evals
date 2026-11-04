# Bug: The facts carried across compaction contradicted each other: the controller said "Preflight says Codex is not-installed, which overrides the summary's note that Codex was present." Just before that it had said "Codex is installed, so I need the gate doc." The summary carried a wrong fact, though the controller corrected it. In the end every Codex gate degraded and was recorded as ungated.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

The facts carried across compaction contradicted each other: the controller said "Preflight says Codex is not-installed, which overrides the summary's note that Codex was present." Just before that it had said "Codex is installed, so I need the gate doc." The summary carried a wrong fact, though the controller corrected it. In the end every Codex gate degraded and was recorded as ungated.
