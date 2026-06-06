# superpowers-evals

> Behavioral eval lab (Quorum) for Superpowers that drives real coding-agent CLIs through a QA agent and grades them on workflow compliance.

**Family:** superpowers · **Type:** tool · **Lifecycle:** experimental · **Owner:** mhat

## What it does
Quorum drives real coding-agent CLIs (Claude, Codex, Antigravity, Gemini, Kimi, OpenCode, Pi, Copilot) through a Gauntlet QA agent and grades them against scenario acceptance criteria plus deterministic post-checks. It is an eval lab for workflow compliance — skill triggering, worktree behavior, subagent coordination, verification reflexes, review quality, cost-shaping — not a generic benchmark. Static/unit checks are CI-safe; live evals are trusted-maintainer operations that launch agent CLIs in permissive modes.

## How it fits
- Depends on: —
- Used by: —
- External: Anthropic, OpenAI Codex, Google Gemini, Kimi, OpenCode, Pi, Copilot agent CLIs (launched as eval subjects). Superpowers is the system under test (testing relationship, not a code dependency).

## Runtime & data
- Runs: Python CLI (quorum) + shell, run locally by trusted maintainers; GitHub Actions for static/unit checks only.
- Data in: Eval scenarios, acceptance criteria, agent CLI transcripts.
- Data out: Grades, transcripts, tool-call logs, filesystem-state captures.

<!-- Maintained by the maintaining-project-map skill. Do not hand-edit; regenerated. -->
