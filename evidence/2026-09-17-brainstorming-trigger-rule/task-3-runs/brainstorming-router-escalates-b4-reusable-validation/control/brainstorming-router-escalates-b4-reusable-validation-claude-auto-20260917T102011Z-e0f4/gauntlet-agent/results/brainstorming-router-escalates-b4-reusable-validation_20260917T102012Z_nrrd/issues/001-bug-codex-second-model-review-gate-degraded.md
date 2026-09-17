# Bug: Codex second-model review gate degraded silently-ish: agent reported "Codex spec gate: degraded. Preflight reported ok, but the resolved companion is a stub build (0.0.0-stub) and both calls — the approach gate and this spec review — returned an empty payload with exit 0." It also noted it could not record an ungated-ledger event because the failure mode maps to none of the four defined status tokens (not-installed/not-ready/stale-broker/preflight-error). That gap in the status vocabulary means degraded runs go unrecorded in sweep data.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b4-reusable-validation
**Scenario Status:** pass

## Description

Codex second-model review gate degraded silently-ish: agent reported "Codex spec gate: degraded. Preflight reported ok, but the resolved companion is a stub build (0.0.0-stub) and both calls — the approach gate and this spec review — returned an empty payload with exit 0." It also noted it could not record an ungated-ledger event because the failure mode maps to none of the four defined status tokens (not-installed/not-ready/stale-broker/preflight-error). That gap in the status vocabulary means degraded runs go unrecorded in sweep data.
