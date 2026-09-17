# Bug: Codex review gate degraded silently-ish: agent reported "Preflight reported ok, but the installed companion is a 0.0.0-stub build and both calls (approach gate and spec gate) returned an empty {}". Preflight reporting ok while the companion returns nothing looks like a preflight check that doesn't validate the stub/version.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b2-config-module
**Scenario Status:** pass

## Description

Codex review gate degraded silently-ish: agent reported "Preflight reported ok, but the installed companion is a 0.0.0-stub build and both calls (approach gate and spec gate) returned an empty {}". Preflight reporting ok while the companion returns nothing looks like a preflight check that doesn't validate the stub/version.
