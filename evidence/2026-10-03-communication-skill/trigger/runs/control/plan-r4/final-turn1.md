I wrote the implementation plan and Codex approved it. Before running it, I need your go-ahead on one thing: I'm on `master`, and nothing in your instructions says whether I should work in a separate worktree. **Want me to set one up?** It keeps the changes off `master`. If you'd rather, I can work on `master` directly.

**The plan** is at `docs/hyperpowers/plans/2026-10-03-note-tags.md` and isn't committed. It has two tasks:

1. **Tag extraction and filtering:** a `tags(text)` helper that returns lowercased tag names, and `list_notes(tag=None)` that keeps only notes carrying that whole tag, case-insensitively. It comes with tests.
2. **The `--tag` option on the command line:** `list --tag <tag>` filters the list. A `USAGE` constant becomes `usage: notes.py add <text> | list [--tag <tag>]`, and any other option after `list` prints that line and exits 2. It comes with tests and a README update.

**Decisions I made where the spec is silent:**
- `list --tag` with no value, or with `--tag` given twice, prints the usage line and exits 2.
- An unknown command like `notes.py frobnicate` still prints `unknown command: …`, since the spec only covers unknown options.
- Tags are split on whitespace only, so `#errands,` keeps the comma as part of the tag.
- `--tag` takes the name without `#`, as in the spec's example.

**Existing behavior the plan keeps:** `list_notes()` sorts by note text, not by date. The test `test_list_is_in_date_order` only passes because its sample data happens to be in the same order both ways. The spec says `list` without `--tag` should behave as it does today, so the plan leaves the sort alone. Tell me if you want that fixed separately.

**Codex review:** it took 2 rounds. Round 1 flagged that I had marked Task 1 as low risk, but it edits two files, so I raised it to standard. I also took its minor suggestion to run mypy on `test_notes.py` as well as `notes.py`. Round 2 approved the plan with no findings.

**Other changes:** your CLAUDE.md asks for `.gitignore` to exclude `docs/superpowers` and `docs/hyperpowers`, and the repo had no `.gitignore`, so I created one with those two entries. It isn't committed yet.

The existing tests pass (2 passed). I haven't changed any code yet.