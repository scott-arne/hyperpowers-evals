# Over-trigger measurement (2026-09-16)

Follow-up to the external-workflow-adoption branch: its eighth sentinel batch
had one `cost-checkbox-over-trigger` failure, which the human partner chose to
treat as a regression to investigate. Phase 1
(`../2026-09-10-external-workflow-adoption/task-23-reruns/over-trigger-investigation-phase-1.md`)
found identical inputs across runs and one sampled first action deciding the
outcome, and that Claude Code's skill-listing budget (context tokens x 3
bytes/token x 1% = 6000 chars for Opus) drops 14 of 15 hyperpowers skill
descriptions in a fresh session, so the brainstorming description was never
in the model's context.

This directory holds the Phase 2 measurement the human partner approved:
`cost-checkbox-over-trigger` and its calibration twin
`brainstorming-resists-jump-to-implementation`, each under two conditions at
one pinned skills tree:

- **as-is**: the harness as it stands (listing budget 6000 chars; descriptions
  dropped).
- **descriptions-on**: `SLASH_COMMAND_TOOL_CHAR_BUDGET=20000` in the runner's
  environment, which Claude Code honours as the listing budget, so every
  description renders.

Dependent variables per run: turn-1 action class (Skill(brainstorming) /
exploration / direct edit), pass/fail, token totals, and the SessionStart
payload and skill-listing hashes. Logs under `logs/`, run copies under
`runs-<condition>/`, the analysis in `analysis.md`.
