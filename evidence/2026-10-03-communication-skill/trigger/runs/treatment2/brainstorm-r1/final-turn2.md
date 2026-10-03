Here's the design. Nothing changes on disk: tags stay as words inside the note text, and the work is a parsing helper, a filter in `list_notes()`, and a `--tag` option on `list`.

**Recognizing a tag.** A new `tags(text) -> set[str]` function splits the note on whitespace and keeps every word that starts with `#`. It drops the `#`, strips trailing `.,;:!?`, and lowercases the result. Some examples:
- `buy milk #errands #Home` gives `{"errands", "home"}`.
- `#errands,` counts as `errands`, because tags at the end of a sentence are common.
- A lone `#` is not a tag.
- `C#` is not a tag, because the word doesn't start with `#`.

**Filtering.** `list_notes(tag: str | None = None)` keeps a note only if the lowercased tag is in `tags(text)`. A leading `#` on the argument is ignored, so `--tag '#errands'` (you'd need the quotes, or the shell would treat the rest of the line as a comment) works the same as `--tag errands`. With no tag, `list` prints every note, as it does now. If nothing matches, it prints nothing and exits 0.

**Command line.** `main()` keeps its hand-written argument handling (no `argparse`), so the change stays small and the error output stays in the current format. `list` accepts nothing after it, or exactly `--tag <value>`. Anything else prints the usage line and exits 2: an unknown option, `--tag` with no value, or extra words. The usage line becomes `usage: notes.py add <text> | list [--tag <tag>]`.

**Sort fix.** I'll change the sort key in `list_notes()` from the text to the date. Python's sort is stable, so notes from the same day stay in the order you added them. As I mentioned, this changes the order `list` prints today.

**Files.** `notes.py`, `test_notes.py`, and one usage line in `README.md`. I'll leave `docs/spec-tags.md` alone. It already agrees with this design, apart from not mentioning punctuation.

**Tests**, written first:
- `tags()` on: several tags, mixed case, trailing punctuation, a lone `#`, and `C#`
- `list_notes(tag=...)` ignores case and ignores a leading `#` on the argument
- `main()` exits 2 on an unknown option, on `--tag` with no value, and on extra words
- a date-order test whose alphabetical order differs from its date order

I'll run `pytest`, `ruff`, and `mypy` before I report back.

The punctuation stripping and the date-order fix are the two choices you might not have made yourself. Should I go ahead as written, or change either of them first?