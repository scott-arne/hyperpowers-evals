The design: add a `tags(text)` helper in `notes.py`. Give `list_notes()` an optional `tag` parameter. Parse `--tag` by hand in `main()`, the way the existing commands are parsed. Nothing changes in `notes.txt`.

**Parsing tags.** `tags(text)` splits the note on whitespace and keeps each word that starts with `#` and has at least one character after it. It drops the `#`, strips trailing punctuation (`.,;:!?`), and lowercases what's left with `casefold()`. It returns a set. With the punctuation strip, `pick up milk #errands.` still counts as tagged `errands`. A bare `#` or a word like `C#` is not a tag. `C#` doesn't start with `#`, so it's skipped anyway.

**Matching.** `list --tag errands` keeps a note only if `errands` is in its tag set, compared case-insensitively. A whole tag has to match, so `--tag errand` does not match `#errands`. I'll also accept `--tag '#errands'` by dropping a leading `#` from the argument, since people will type it that way. When nothing matches, `list` prints nothing and exits 0, which is what it does today on an empty file.

**Command line.** I'll keep the hand-written parsing instead of switching to argparse. argparse would replace your usage message and error output with its own. These cases print the usage line and exit 2:

- `list` with an unknown option
- `--tag` with no value
- `--tag` given twice (multiple tags are out of scope)

The usage line becomes `usage: notes.py add <text> | list [--tag <tag>]`.

**Sort fix.** `list_notes()` will sort by date instead of by text. Python's sort is stable, so notes from the same day stay in the order they were added. I'll change the existing date-order test's fixture so the text order and date order disagree. That way the test fails against the current code and passes after the fix.

**Tests.** These go in `test_notes.py`, following the existing `tmp_path`/`monkeypatch.chdir` pattern:

- `tags()` on several tags, trailing punctuation, a bare `#`, and mixed case
- filtering, including a case-insensitive match and that `errand` doesn't match `errands`
- `--tag` with a leading `#`
- `list` without `--tag` returns everything
- `main()` exits 2 for an unknown option, a missing value, and a repeated `--tag`

I'll also add a `list --tag` example to the README. I'll implement it test-first and run `pytest`, `ruff`, and `mypy`.

Do you want me to go ahead with this, including the sort fix in the same change?