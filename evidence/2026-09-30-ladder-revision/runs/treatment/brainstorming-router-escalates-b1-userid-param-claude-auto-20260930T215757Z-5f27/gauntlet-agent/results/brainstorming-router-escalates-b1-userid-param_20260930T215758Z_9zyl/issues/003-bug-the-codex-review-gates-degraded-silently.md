# Bug: The Codex review gates degraded silently to self-review. Preflight reported 'ok', but the stub companion (0.0.0-stub) returned {} for both the approach gate and the spec-review gate. The agent disclosed this and recorded it in the ungated ledger, but a preflight 'ok' followed by empty results is inconsistent.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The Codex review gates degraded silently to self-review. Preflight reported 'ok', but the stub companion (0.0.0-stub) returned {} for both the approach gate and the spec-review gate. The agent disclosed this and recorded it in the ungated ledger, but a preflight 'ok' followed by empty results is inconsistent.
