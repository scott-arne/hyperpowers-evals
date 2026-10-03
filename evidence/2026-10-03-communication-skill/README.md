# 2026-10-03 communication skill

Micro-test of `skills/communication/SKILL.md` (hyperpowers), run with fresh
single-shot Claude Code subagents (general-purpose, the session's default
subagent model) rather than quorum. Each subagent wrote one message to a
file with the Write tool. The treatment arm received the full SKILL.md text
inline as a loaded skill; the control arm received the task only.

Layout:

    scenarios/           the three prompts, with OUTPUT_PATH as the placeholder
    control/s<N>-r<K>.md no-skill output, scenario N, rep K
    treatment/           same prompts with the skill loaded
    score.py             regex counts per tell; every match was read by hand
    baseline-notes.md    the hand-read of the control arm, with verbatim quotes

Evidence note: `docs/hyperpowers/2026-10-03-communication-skill-eval-evidence.md`
in the hyperpowers repository.

## trigger/

Second measurement (same day): does the skill get invoked at the human-facing
points once each process skill carries a `REQUIRED SUB-SKILL` line? Live
`claude -p` sessions with the worktree as `--plugin-dir` and an empty config
dir. `run-trigger.sh` is the launcher, `campaign.sh` the arm runner,
`apply-crossrefs.py` the exact insertion applied between the control and
treatment arms, `extract.py` and `finals.py` the summarizers.

    trigger/prompts/              one file per scenario turn
    trigger/fixtures/base/        the notes CLI fixture every session started from
    trigger/runs/control/         before the lines (5 scenarios x 5)
    trigger/runs/treatment/       after the lines (5 scenarios x 5)
    trigger/runs/treatment2/      bootstrap line moved into The Rule (trivial x5, oneliner x5, brainstorm x3)
    trigger/runs/<arm>/<run>/     turn*.jsonl transcripts, summary.txt, final-turn*.md, status.txt

Per-run `work/` fixture copies and `config/` session state were not copied.
