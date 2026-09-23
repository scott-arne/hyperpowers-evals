# Bug: The environment's global CLAUDE.md (/Users/johnss51/.claude/CLAUDE.md, surfaced in the session log) contains a '## Plan execution' section that says: '[redacted: quoted from host CLAUDE.md]' This fixture directly contradicts the acceptance criterion — the host user's real CLAUDE.md appears to be leaking into what should be an isolated per-run HOME.

**Kind:** bug
**Scenario:** triggering-executing-plans
**Scenario Status:** fail

## Description

The environment's global CLAUDE.md (/Users/johnss51/.claude/CLAUDE.md, surfaced in the session log) contains a '## Plan execution' section that says: '[redacted: quoted from host CLAUDE.md]' This fixture directly contradicts the acceptance criterion — the host user's real CLAUDE.md appears to be leaking into what should be an isolated per-run HOME.
