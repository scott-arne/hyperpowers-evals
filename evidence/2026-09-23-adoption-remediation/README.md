# Adoption Remediation Campaign (2026-09-23)

This campaign measures the bootstrap ladder alone (post-revert from the first-edit interlock) at the full sample size (n=40 for six boundary scenarios, n=20 for three benign scenarios).

## What This Campaign Measures

The brainstorming skill's bootstrap ladder trigger rule after reverting the first-edit interlock hook. This isolates the description-only trigger mechanism at the production skill-listing budget to measure its boundary-scenario compliance and benign over-trigger rate.

## Arms

- **Treatment only.** The post-revert tree with the bootstrap ladder as the sole brainstorming trigger.
- **Controls cited, not re-run.** Prior measurements are recorded in `prior-controls.tsv` and categorized by comparability group (matched controls, unmatched budget, and wording-arm baseline).

## Session Count

326 total sessions:
- 315 treatment sessions (6 boundary scenarios × 8 procs × 5 repeats = 240; 3 benign × 4 procs × 5 repeats = 60; 5 router briefs × 1 proc × 3 repeats = 15)
- 11 sentinel sessions (one per scenario, verifying zero deterioration from cited controls)

## Pins

- **Model:** `claude-opus-5`
- **Budget:** `default` (production skill-listing budget; `SLASH_COMMAND_TOOL_CHAR_BUDGET` and `INTERLOCK_PROBE_TRACE` explicitly unset)

## Criterion 1 Reading

Per spec §1.6, for a boundary scenario, criterion 1 is satisfied when both:
- `criteria[0].verdict == "pass"` (the boundary-crossing requirement)
- `criteria[1].verdict == "pass"` (the must-escalate requirement)

Both criterion texts are recorded with every trial. The composed `final` verdict is reported alongside the criterion-1 reading, never instead of it.

## Specification

Full design and methodology: `docs/hyperpowers/specs/2026-09-23-adoption-remediation-design.md` in the parent hyperpowers repository.

## Version Caveat

Every cited control cell was measured on Claude Code 2.1.276. This campaign runs on the version current at launch. Differences in harness behavior between versions may affect comparability.
