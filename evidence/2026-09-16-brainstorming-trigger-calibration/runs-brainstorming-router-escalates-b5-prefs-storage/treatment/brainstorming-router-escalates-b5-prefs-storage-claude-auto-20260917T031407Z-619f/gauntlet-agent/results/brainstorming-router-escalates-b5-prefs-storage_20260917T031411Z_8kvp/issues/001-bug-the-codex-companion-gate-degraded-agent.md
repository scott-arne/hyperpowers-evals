# Bug: The Codex companion gate degraded: agent reported 'the installed companion is a stub (0.0.0-stub) that returns {} for both the approach consultation and both spec lenses' and logged ledger event 20260917T032551Z-23056-4059. Preflight reported ok despite the stub returning nothing — preflight seems not to detect the non-functional stub. The agent handled it gracefully (surfaced 'the approach shortlist was single-source') but the gate provided no value.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b5-prefs-storage
**Scenario Status:** pass

## Description

The Codex companion gate degraded: agent reported 'the installed companion is a stub (0.0.0-stub) that returns {} for both the approach consultation and both spec lenses' and logged ledger event 20260917T032551Z-23056-4059. Preflight reported ok despite the stub returning nothing — preflight seems not to detect the non-functional stub. The agent handled it gracefully (surfaced 'the approach shortlist was single-source') but the gate provided no value.
