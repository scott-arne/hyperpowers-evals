# Bug: Codex integration gates degraded: screen showed "Codex returned an empty payload ... codexVersion 0.0.0-stub" for both the approach gate and both spec-review lenses, with "status --json shows no jobs at all". The agent handled it gracefully (recorded ungated event 20260917T012606Z-21529-8097) but the seeded Codex stub provided zero review value.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

Codex integration gates degraded: screen showed "Codex returned an empty payload ... codexVersion 0.0.0-stub" for both the approach gate and both spec-review lenses, with "status --json shows no jobs at all". The agent handled it gracefully (recorded ungated event 20260917T012606Z-21529-8097) but the seeded Codex stub provided zero review value.
