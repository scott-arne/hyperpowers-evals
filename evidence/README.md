# Evidence

Run artifacts that an evidence note in the hyperpowers repository cites by path.
One directory per plan, named after the plan file's date and slug, holding the
per-task run archives exactly as the plan's controller preserved them
(verdicts, launch captures, transcripts, witnesses, frozen tool snapshots).

Why here: the SDD workspace under the user cache is scratch — the Finish step
deletes it and the reaper reclaims idle siblings — so a note that cites it
would rot. `evals/results/` is gitignored and per-host. This tree is committed,
so a citation survives the workspace, the host, and the cache.

Layout:

    evidence/<YYYY-MM-DD-plan-slug>/task-<N>-runs/<round or arm>/<run>/...

Rules: copy, never move, from the workspace while the plan is live; do not edit
an artifact after it is cited; keep JSON and logs as the tools wrote them.

## Before committing a run

In order:

1. Run `scripts/strip-runs` over the run. It deletes the reinstallable agent
   infrastructure and the host state a run picks up (the cloud-provider env
   file, the session IPC locks, the node caches).
2. Rename `coding-agent-workdir/.git` to `git-dir`. Left alone, the fixture
   repository commits as a gitlink and its contents are lost.
3. Stage `gauntlet-agent/results/` and `home/.claude/` with `git add -f`.
   The repository's `results/` and `.claude/` ignore patterns are unanchored,
   so they match those directories at any depth.
4. Post-check the staged tree: every run has at least one transcript and one
   `result.json`, and there are no gitlinks.

Commit ids cited in the evidence before 2026-09-16 may predate a history rewrite of the then-unpushed range (session key files removed); `history-rewrite-2026-09-16.tsv` maps old ids to new.

Commit ids cited before 2026-10-01 may predate a second rewrite (the operator's private instruction text redacted from archived transcripts); `history-rewrite-2026-10-01.tsv` maps old ids to new. The hyperpowers commits pinned in manifests changed in the same rewrite and resolve through `docs/hyperpowers/history-rewrite-2026-10-01.tsv` in that repository; only one plan document differs at the new ids, so an analyzer re-runs with each pin replaced by its mapped id.
