I've stopped before writing any implementation code because one decision is yours. The repo is on `master`, and the workflow won't implement there without your consent. Your CLAUDE.md doesn't say where feature work should go, so I need you to pick one:

1. **A git worktree on a new branch, for example `feature/tags` under `.worktrees/`.** This keeps `master` untouched. The new worktree won't contain the uncommitted plan or `.gitignore`, so I'd first commit `.gitignore`, which is needed anyway to keep `.worktrees/` out of git. The plan file would stay where it is, untracked.
2. **A new `feature/tags` branch in the current checkout.** This is the simplest option, and the untracked files carry over as they are.
3. **Commit straight to `master`.**

I'd go with option 2, since this is a two-task change. Once you choose, the two tasks run with a review after each.