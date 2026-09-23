# Bug: Agent reported the Codex companion review gates degraded: 'the Codex companion installed here is the 0.0.0-stub build. Preflight reported ok, but the companion returned an empty {} for both the approach gate and the spec gate, so neither ran for real.' Preflight reporting ok while the companion returns empty responses looks like a real preflight/health-check gap worth investigating (the seeded stub may be the cause).

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b4-reusable-validation
**Scenario Status:** pass

## Description

Agent reported the Codex companion review gates degraded: 'the Codex companion installed here is the 0.0.0-stub build. Preflight reported ok, but the companion returned an empty {} for both the approach gate and the spec gate, so neither ran for real.' Preflight reporting ok while the companion returns empty responses looks like a real preflight/health-check gap worth investigating (the seeded stub may be the cause).
