# Bug: Codex-based spec review degraded: screen reported "both spec lenses — completeness-and-consistency and feasibility-and-scope — ran foreground over the dossier. Each returned {}" and verdict-normalize scored both "incomplete (json payload has no terminal verdict)"; `status --json` showed no jobs (running: [], recent: []). Agent attributed it to the stub companion (0.0.0-stub, no config.toml in $CODEX_HOME) and continued with self-review only. Worth checking whether the stub should produce a usable verdict.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b4-reusable-validation
**Scenario Status:** pass

## Description

Codex-based spec review degraded: screen reported "both spec lenses — completeness-and-consistency and feasibility-and-scope — ran foreground over the dossier. Each returned {}" and verdict-normalize scored both "incomplete (json payload has no terminal verdict)"; `status --json` showed no jobs (running: [], recent: []). Agent attributed it to the stub companion (0.0.0-stub, no config.toml in $CODEX_HOME) and continued with self-review only. Worth checking whether the stub should produce a usable verdict.
