# Bug: Codex spec gate failed silently-ish: agent reported 'Both returned empty payloads, and verdict-normalize scored each incomplete — "json payload has no terminal verdict"' and recorded ungated event 20260917T021331Z-34779-3243. Codex stub (codex-plugin-cc 0.0.0-stub) preflight said ok but produced no verdict; also 'no config.toml under $CODEX_HOME'. Review gate effectively did nothing.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

Codex spec gate failed silently-ish: agent reported 'Both returned empty payloads, and verdict-normalize scored each incomplete — "json payload has no terminal verdict"' and recorded ungated event 20260917T021331Z-34779-3243. Codex stub (codex-plugin-cc 0.0.0-stub) preflight said ok but produced no verdict; also 'no config.toml under $CODEX_HOME'. Review gate effectively did nothing.
