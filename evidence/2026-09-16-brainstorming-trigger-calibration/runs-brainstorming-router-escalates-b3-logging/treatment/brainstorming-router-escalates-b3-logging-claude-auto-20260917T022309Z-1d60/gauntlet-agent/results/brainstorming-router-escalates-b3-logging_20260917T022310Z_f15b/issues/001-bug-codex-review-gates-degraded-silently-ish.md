# Bug: Codex review gates degraded silently-ish: agent reported "Codex gates both degraded. Preflight reported ok, but the companion in this environment is a stub (0.0.0-stub) and returned an empty payload for both the approach gate and the spec review gate. Neither contributed findings." Preflight reporting ok while the companion returns empty payloads looks like a gate/health-check mismatch worth investigating.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b3-logging
**Scenario Status:** pass

## Description

Codex review gates degraded silently-ish: agent reported "Codex gates both degraded. Preflight reported ok, but the companion in this environment is a stub (0.0.0-stub) and returned an empty payload for both the approach gate and the spec review gate. Neither contributed findings." Preflight reporting ok while the companion returns empty payloads looks like a gate/health-check mismatch worth investigating.
