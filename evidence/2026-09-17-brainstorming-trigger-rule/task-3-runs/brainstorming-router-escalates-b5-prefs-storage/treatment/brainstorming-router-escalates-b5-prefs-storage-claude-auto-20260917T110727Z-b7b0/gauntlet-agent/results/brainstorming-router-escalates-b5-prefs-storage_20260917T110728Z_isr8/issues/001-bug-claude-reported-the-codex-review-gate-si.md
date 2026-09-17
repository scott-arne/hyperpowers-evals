# Bug: Claude reported the Codex review gate silently no-op'd: "Preflight reported ok, but the installed companion is the 0.0.0-stub build and returned an empty response for both the approach gate and the spec gate" — it recorded an ungated ledger entry (20260917T111902Z-54957-12145). The stub passing preflight but returning nothing means the gate reports success without reviewing anything.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b5-prefs-storage
**Scenario Status:** pass

## Description

Claude reported the Codex review gate silently no-op'd: "Preflight reported ok, but the installed companion is the 0.0.0-stub build and returned an empty response for both the approach gate and the spec gate" — it recorded an ungated ledger entry (20260917T111902Z-54957-12145). The stub passing preflight but returning nothing means the gate reports success without reviewing anything.
