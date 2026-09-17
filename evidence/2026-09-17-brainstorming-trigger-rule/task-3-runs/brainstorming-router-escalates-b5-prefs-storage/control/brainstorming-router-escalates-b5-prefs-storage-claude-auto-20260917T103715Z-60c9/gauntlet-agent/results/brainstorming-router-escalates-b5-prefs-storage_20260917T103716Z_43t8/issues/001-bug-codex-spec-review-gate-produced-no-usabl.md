# Bug: Codex spec-review gate produced no usable review: agent reported both spec lenses exited 0 but wrote empty {} payloads, verdict-normalize returned 'incomplete', and `status --json` showed no jobs at all (running: [], latestFinished: null). Agent attributed it to the stub companion (codexVersion 0.0.0-stub, no config.toml at $CODEX_HOME). If the stub is meant to return a usable verdict, this is broken fixture/plugin behavior.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b5-prefs-storage
**Scenario Status:** pass

## Description

Codex spec-review gate produced no usable review: agent reported both spec lenses exited 0 but wrote empty {} payloads, verdict-normalize returned 'incomplete', and `status --json` showed no jobs at all (running: [], latestFinished: null). Agent attributed it to the stub companion (codexVersion 0.0.0-stub, no config.toml at $CODEX_HOME). If the stub is meant to return a usable verdict, this is broken fixture/plugin behavior.
