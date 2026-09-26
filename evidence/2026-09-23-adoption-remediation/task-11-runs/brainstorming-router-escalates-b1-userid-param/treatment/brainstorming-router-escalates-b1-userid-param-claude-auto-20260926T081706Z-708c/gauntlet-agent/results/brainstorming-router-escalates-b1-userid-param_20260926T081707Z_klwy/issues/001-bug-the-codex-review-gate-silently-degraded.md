# Bug: The Codex review gate silently degraded: 'preflight reported ok, but codex-companion returned an empty response for the spec review too, so the spec went unreviewed by Codex' — this happened on both the approach gate and the spec gate. The agent recorded it in an 'ungated ledger' and proceeded. A gate that never blocks and always returns empty against the seeded codex stub looks like a broken integration worth investigating.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The Codex review gate silently degraded: 'preflight reported ok, but codex-companion returned an empty response for the spec review too, so the spec went unreviewed by Codex' — this happened on both the approach gate and the spec gate. The agent recorded it in an 'ungated ledger' and proceeded. A gate that never blocks and always returns empty against the seeded codex stub looks like a broken integration worth investigating.
