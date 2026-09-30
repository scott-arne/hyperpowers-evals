# Bug: The Codex spec gate returned empty {} payloads (the stub reports version 0.0.0-stub with no config.toml), so the verdict was 'incomplete'. The agent handled this openly: it wrote an ungated-ledger entry and said the spec had not been reviewed by Codex. With the stub installed, though, the gate can never pass.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

The Codex spec gate returned empty {} payloads (the stub reports version 0.0.0-stub with no config.toml), so the verdict was 'incomplete'. The agent handled this openly: it wrote an ungated-ledger entry and said the spec had not been reviewed by Codex. With the stub installed, though, the gate can never pass.
