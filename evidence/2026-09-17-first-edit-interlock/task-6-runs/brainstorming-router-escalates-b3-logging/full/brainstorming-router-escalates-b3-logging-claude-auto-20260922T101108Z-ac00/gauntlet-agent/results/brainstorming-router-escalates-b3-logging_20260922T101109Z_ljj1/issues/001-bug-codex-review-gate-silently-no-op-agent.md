# Bug: Codex review gate silently no-op: agent reported "Codex spec gate: skipped, no review performed. Preflight reported ok, but the resolved binary is a 0.0.0-stub and the companion returned an empty {} for both the approach gate and the spec gate." Preflight says ok while the companion returns nothing — misleading preflight signal (ledger id 20260922T102215Z-26580-23573).

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b3-logging
**Scenario Status:** pass

## Description

Codex review gate silently no-op: agent reported "Codex spec gate: skipped, no review performed. Preflight reported ok, but the resolved binary is a 0.0.0-stub and the companion returned an empty {} for both the approach gate and the spec gate." Preflight says ok while the companion returns nothing — misleading preflight signal (ledger id 20260922T102215Z-26580-23573).
