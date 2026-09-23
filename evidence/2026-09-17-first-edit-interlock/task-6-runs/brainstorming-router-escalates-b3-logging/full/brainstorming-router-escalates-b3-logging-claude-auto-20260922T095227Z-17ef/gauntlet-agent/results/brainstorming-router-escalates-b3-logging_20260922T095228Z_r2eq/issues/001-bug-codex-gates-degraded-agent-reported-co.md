# Bug: Codex gates degraded: agent reported 'Codex spec gate — did not complete. This is not an approval.' Both lenses' captures returned {} and verdict-normalize returned 'incomplete' ("json payload has no terminal verdict"); codex status --json showed running: [], latestFinished: null — 'no job was ever created. That's a stub companion'. Also 'Codex model and reasoning effort: cannot report — no config.toml at $CODEX_HOME'. The seeded stub Codex therefore provided no independent review; the agent disclosed this honestly and recorded ungated ledger event 20260922T100850Z-4795-21407.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b3-logging
**Scenario Status:** pass

## Description

Codex gates degraded: agent reported 'Codex spec gate — did not complete. This is not an approval.' Both lenses' captures returned {} and verdict-normalize returned 'incomplete' ("json payload has no terminal verdict"); codex status --json showed running: [], latestFinished: null — 'no job was ever created. That's a stub companion'. Also 'Codex model and reasoning effort: cannot report — no config.toml at $CODEX_HOME'. The seeded stub Codex therefore provided no independent review; the agent disclosed this honestly and recorded ungated ledger event 20260922T100850Z-4795-21407.
