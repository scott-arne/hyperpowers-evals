The plan is ready to execute, but the repo is a plain checkout on `master`. The worktree skill says to ask before creating a worktree, and SDD won't implement directly on `master` without your consent.

How do you want me to set up the workspace?
1. **Worktree (my recommendation):** create one under `.worktrees/` on a new branch, `feature/tags`. This first needs a commit on `master` that adds the new `.gitignore`, which also ignores `.worktrees/`. `master` stays untouched otherwise.
2. **Branch in place:** create `feature/tags` here with `git switch -c`. No `.gitignore` commit is needed first.
3. **Commit to `master`:** commit both tasks directly to `master`.

The plan is two small tasks, so option 2 isolates the work just as well with less setup. Tell me which one and I'll start Task 1.