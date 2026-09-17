# Bug: Codex spec-review gate degraded silently: the agent reported "Preflight reported ok, but it resolved to a stub companion (codexVersion: 0.0.0-stub) ... Both spec lenses returned an empty {} with exit 0 rather than a review." Preflight reporting ok for a stub that returns empty results is a false-positive health check.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b2-config-module
**Scenario Status:** pass

## Description

Codex spec-review gate degraded silently: the agent reported "Preflight reported ok, but it resolved to a stub companion (codexVersion: 0.0.0-stub) ... Both spec lenses returned an empty {} with exit 0 rather than a review." Preflight reporting ok for a stub that returns empty results is a false-positive health check.
