# 2026-10-03: Harness-confound attribution for the over-trigger floor

**Hypothesis.** Written to the operator's scratch directory before launch
(file time 18:24:24Z, hashed 18:24:42Z, launch 18:27:47Z) and not committed
first; the evidence README carries it verbatim.

`2026-10-03-release-6150-paired-control` put `cost-checkbox-over-trigger`
at 0 of 10 for v6.14.0 and v6.15.0 alike on Claude Code 2.1.287. Two harness
leaks reached those sessions:
- the repository instruction text, loaded as `AGENTS.md` (fixed in
  `fc42537c5`);
- the operator's Claude environment, `CLAUDE_CODE_ENTRYPOINT=sdk-ts`
  included (fixed in `be020f0d0`).

One pilot on the fixed harness passed. Every comparison is a two-sided
Fisher exact test on pass counts, and "separated" means p < 0.05.
- **Q1.** Was the floor a harness artifact? Arm A against the paired
  treatment's 0 of 10.
- **Q2.** Do the versions differ on the clean harness? A against B.
- **Q3.** Which leak drives it? C against A and D against A. A leak drives it
  when its arm is separated below A.

The pre-registered consequences for hyperpowers BACKLOG item 1, the
brainstorming over-trigger:
- A not separated: item 1 proceeds on the clean harness.
- C separated below A: item 1 proceeds, measured with `sdk-ts`.
- D separated below A and C not: item 1 closes as a harness artifact.
- Neither separated: no decision, and a follow-up.

Voids and manipulation checks are as in the README.

**Config.**
- **Scenario.** `cost-checkbox-over-trigger`, unchanged.
- **Arms.** 10 sessions each, run concurrently.
  - A: hyperpowers `5bef46c` (v6.15.0) on the clean harness `be020f0d0`.
  - B: `0634a8e` (v6.14.0, a detached worktree) on the same harness.
  - C: v6.15.0 on `5f2bc248e`, which is `be020f0d0` plus
    `CLAUDE_CODE_ENTRYPOINT=sdk-ts` on the launcher's exec line.
  - D: v6.15.0 on `50858a29d`, which is `be020f0d0` with `fc42537c5`
    reverted.
  - The C and D branches stay local. Their diffs are in the evidence `logs/`.
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code
  2.1.287, default listing budget. The Gauntlet-Agent graded on
  `claude-opus-5-5`.
- **Window.** 18:27:47Z to 18:41:32Z. A first launch at 18:25Z put bun's
  `--cwd` flag before `run`, so bun printed its usage and exited 0. No runs
  were created.

**Run pointers.** `evidence/2026-10-03-harness-confound-attribution/`,
containing:
- `README.md`, with the pre-registration and the results;
- `manifest.tsv`;
- `archive-runs.sh`;
- `logs/`, with each arm's quorum output, the launch commands and times, the
  pre-registration, the pre-launch and post-run readouts, and the two arm
  patches;
- `tally.py` and `tally.txt`;
- the run archives under `runs/a-clean-6150/`, `runs/b-clean-6140/`,
  `runs/c-entrypoint/`, `runs/d-agentsmd/` and `runs/pilot/`.

**Verdict.** Item 1 closes as a harness artifact. The four arms finished
A 10 of 10, B 10 of 10, C 10 of 10 and D 0 of 10.
- **Q1 is separated** (p = 1.08e-05). The paired control's floor came from
  the harness.
- **Q2 is not separated** (p = 1). The versions do not differ on the clean
  harness.
- **Q3 separates D below A** (p = 1.08e-05) **but not C** (p = 1). On this
  scenario and on 2.1.287, the over-trigger needs the repository instruction
  text. The `sdk-ts` entrypoint has no effect.
- **The listed description alone does not reproduce it.** All 40 sessions
  listed brainstorming's full description. A, B and C never called a skill.
  Every D session called `Skill(hyperpowers:brainstorming)` first, classified
  the request as bounded, and stopped for approval.
- **Clean run.** No voids and no exclusions. Every session passed its arm's
  manipulation check: root, model, version, entrypoint, instruction files and
  task tools. Both roots and all three harness trees were unchanged across
  the window.

**Limits.**
- **Which file primes is not separated.** D loaded `hyperpowers/AGENTS.md`
  and `hyperpowers/evals/AGENTS.md` together.
- **The description's share is untested.** No arm had the instruction text
  without the description. The 2026-09-30 sentinel's single pass on 2.1.284,
  with the same text and brainstorming as a bare name, suggests the two
  interact.
- **Earlier campaigns.** Campaigns from `2026-09-17-first-edit-interlock`
  (2.1.276) through `74d2482` loaded the repository text as `CLAUDE.md`.
  Campaigns from `74d2482` through `fc42537c5` loaded it as `AGENTS.md`
  wherever the fixture had no `CLAUDE.md`:
  - `2026-10-02-companion-over-trigger`;
  - the four `2026-10-02-plans-component-library-*` campaigns;
  - the paired control.

  Their numbers stand as measured under that text, and reusing them on the
  clean harness needs a re-measurement. Campaigns on 2.1.261, the 2026-09-16
  over-trigger measurement included, cannot be read for it.
- **Outside the harness.** The human partner's own sessions in the
  hyperpowers repository load the same text, so closing item 1 does not cover
  them.
- **Records.** The pre-registration was not committed before launch.
- **Scope.** One scenario, one model, one Claude Code version, n=10 per arm.
