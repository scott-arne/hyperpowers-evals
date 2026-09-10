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
