The plan is ready: `docs/hyperpowers/plans/2026-10-03-tags.md`, uncommitted. Codex approved it on round 3 of 4; the summary above has the details.

Before execution starts I need one decision. You're on `master` in the main checkout, and nothing in your instructions says where implementation commits should go. Subagent-Driven Development won't start on `master` without your OK.

My recommendation is a worktree on a new branch, `feature/tags`, in `.worktrees/`. That keeps `master` untouched until you merge. I'll add `.worktrees/` to `.gitignore` as part of setup. The alternative is committing the two tasks directly on `master`.

Which do you want? Once you answer, I'll run both tasks through the per-task review and Codex gates without stopping again.