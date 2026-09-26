# Bug: The Codex spec-review gate produced nothing: agent reported "Preflight reported ok, but the installed companion is version 0.0.0-stub and returned an empty {} for all three calls — the approach consultation and both round-1 spec lenses". The spec therefore had no independent review; the agent recorded the degrade (event 20260926T083522Z-52701-13378) instead of failing. Worth investigating whether preflight should report ok for a stub.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b2-config-module
**Scenario Status:** pass

## Description

The Codex spec-review gate produced nothing: agent reported "Preflight reported ok, but the installed companion is version 0.0.0-stub and returned an empty {} for all three calls — the approach consultation and both round-1 spec lenses". The spec therefore had no independent review; the agent recorded the degrade (event 20260926T083522Z-52701-13378) instead of failing. Worth investigating whether preflight should report ok for a stub.
