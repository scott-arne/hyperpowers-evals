# SDD dispatch guard: evidence

Artifacts for `docs/hyperpowers/2026-11-10-sdd-dispatch-guard-eval-evidence.md`
in hyperpowers (plan `docs/hyperpowers/plans/2026-11-10-sdd-dispatch-guard.md`).

- `task-1-probe/`: the PreToolUse payload probe (`findings.md` is the summary); transcripts redacted with `redact-transcripts.py`.
- `field/`: the frozen replay corpus manifest and the scripts that generated it.
- `replay.mjs`, `replay.test.mjs`: the offline field replay.
- `task-6-replay/`: the replay's output and the hand classification of every refusal.
- `tally.mjs`, `tally.test.mjs`, `archive-runs.sh`, `archive-runs.test.sh`, `launch.sh`: the scenario campaign's tooling.
- `logs/`: one launch log per quorum run, with its `run-id:` and `trials:` lines.
- `task-9-runs/`: the archived scenario runs (`treatment/`, `fork/`) and their tallies.
- `task-10-zed/`: the manual Zed run's logs, transcript and tally.

Run copies follow the hygiene in `archive-runs.sh`: the fixture's `.git` is renamed
`git-dir`, reinstallable host state is removed, `home/.cache/hyperpowers` is kept whole.
Stage `home/.claude` and `gauntlet-agent/results` with `git add -f`: the repository's
`.gitignore` matches `.claude/` and `results/` anywhere.
