# Bug: Agent reported: "Codex spec review gate: skipped. The codex CLI is installed at /opt/homebrew/bin/codex but is unauthenticated — every request returned 401 Unauthorized (missing bearer token)". The scenario states a stub Codex was seeded, so the seeded stub appears not to be usable for the spec-review gate; the second-opinion review step silently degraded to self-review only.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b5-prefs-storage
**Scenario Status:** pass

## Description

Agent reported: "Codex spec review gate: skipped. The codex CLI is installed at /opt/homebrew/bin/codex but is unauthenticated — every request returned 401 Unauthorized (missing bearer token)". The scenario states a stub Codex was seeded, so the seeded stub appears not to be usable for the spec-review gate; the second-opinion review step silently degraded to self-review only.
