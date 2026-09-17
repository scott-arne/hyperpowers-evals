# Bug: The Codex spec-review gate silently no-ops on this machine: agent reported "Preflight returned ok, but the available companion is a stub build (codexVersion: 0.0.0-stub) ... Each returned an empty payload {}" and verdict-normalize said {"result":"incomplete","reason":"json payload has no terminal verdict"}. Preflight reporting 'ok' for a stub that cannot produce verdicts is misleading.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b2-config-module
**Scenario Status:** pass

## Description

The Codex spec-review gate silently no-ops on this machine: agent reported "Preflight returned ok, but the available companion is a stub build (codexVersion: 0.0.0-stub) ... Each returned an empty payload {}" and verdict-normalize said {"result":"incomplete","reason":"json payload has no terminal verdict"}. Preflight reporting 'ok' for a stub that cannot produce verdicts is misleading.
