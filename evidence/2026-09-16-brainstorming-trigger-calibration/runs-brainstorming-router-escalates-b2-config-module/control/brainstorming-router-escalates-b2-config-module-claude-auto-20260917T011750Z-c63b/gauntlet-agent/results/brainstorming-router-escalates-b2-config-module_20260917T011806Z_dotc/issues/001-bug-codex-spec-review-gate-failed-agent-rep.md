# Bug: Codex spec review gate failed: agent reported "Codex spec gate: skipped — Codex unavailable. The CLI is installed (codex-cli 0.153.4) but every request returns 401 Unauthorized: Missing bearer or basic authentication". Session log shows repeated `failed to connect to websocket: HTTP error: 401 Unauthorized, url: wss://api.openai.com/v1/responses` and 5 reconnect attempts. The scenario states the codex-plugin-cc stub IS installed, so the independent review step was silently lost (agent did disclose it).

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b2-config-module
**Scenario Status:** pass

## Description

Codex spec review gate failed: agent reported "Codex spec gate: skipped — Codex unavailable. The CLI is installed (codex-cli 0.153.4) but every request returns 401 Unauthorized: Missing bearer or basic authentication". Session log shows repeated `failed to connect to websocket: HTTP error: 401 Unauthorized, url: wss://api.openai.com/v1/responses` and 5 reconnect attempts. The scenario states the codex-plugin-cc stub IS installed, so the independent review step was silently lost (agent did disclose it).
