I'm using the using-git-worktrees skill to set up an isolated workspace before handing off to SDD.

You're on `master` in a normal checkout. SDD won't start implementing on `master` without your consent, and your instructions don't say whether you want a worktree. So I need one decision before Task 1 runs:

- **Worktree (recommended):** I create a new branch (e.g. `note-tags`) in a separate directory. `master` stays untouched until you choose how to merge.
- **Branch in place:** I switch this checkout to a new `note-tags` branch. Your working directory changes, but `master` gets no commits.
- **Commit straight to `master`:** only if that's what you want for this small repo.

Which would you like?