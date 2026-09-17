# Bug: Codex spec-review gate degraded: agent reported "the installed codex-plugin-cc is version 0.0.0-stub and returned empty payloads", verdict-normalize scored both lenses 'incomplete' ("json payload has no terminal verdict"), and `status --json` showed no jobs (running: [], latestFinished: null). Spec shipped 'unreviewed by Codex'. Expected given the stub, but the failure mode is an empty-payload/no-job condition rather than a clean 'stub unavailable' signal.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b4-reusable-validation
**Scenario Status:** pass

## Description

Codex spec-review gate degraded: agent reported "the installed codex-plugin-cc is version 0.0.0-stub and returned empty payloads", verdict-normalize scored both lenses 'incomplete' ("json payload has no terminal verdict"), and `status --json` showed no jobs (running: [], latestFinished: null). Spec shipped 'unreviewed by Codex'. Expected given the stub, but the failure mode is an empty-payload/no-job condition rather than a clean 'stub unavailable' signal.
