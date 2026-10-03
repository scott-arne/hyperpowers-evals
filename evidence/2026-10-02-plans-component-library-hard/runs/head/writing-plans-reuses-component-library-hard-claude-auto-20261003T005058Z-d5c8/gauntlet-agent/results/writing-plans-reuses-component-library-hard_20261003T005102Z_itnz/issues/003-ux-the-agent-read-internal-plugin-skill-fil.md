# Ux: The agent read internal plugin skill files (requesting-code-review/gate-preflight.md, codex-review-gate.md) and ran an ungated-ledger script, which logged 'degraded-gate ... not-installed' because Codex is missing. It told the user that Codex isn't installed, so only its own review was done. That note is plugin plumbing a user may not expect to see.

**Kind:** ux
**Scenario:** writing-plans-reuses-component-library-hard
**Scenario Status:** pass

## Description

The agent read internal plugin skill files (requesting-code-review/gate-preflight.md, codex-review-gate.md) and ran an ungated-ledger script, which logged 'degraded-gate ... not-installed' because Codex is missing. It told the user that Codex isn't installed, so only its own review was done. That note is plugin plumbing a user may not expect to see.
