Here's the design. Everything goes in `notes.py`, and `notes.txt` keeps its current format.

**Finding tags.** A new `tags(text) -> set[str]` helper splits the note text on whitespace and keeps each word that starts with `#`. It strips the `#` and lowercases the rest with `casefold()`. It also strips trailing punctuation (`.,;:!?`), so `buy milk #errands.` and `#errands,` both count as `errands`. A bare `#` is not a tag. That punctuation rule is a call I made; without it, a tag at the end of a sentence would quietly fail to match.

**Filtering.** `list_notes(tag: str | None = None)` loads the notes, keeps only those whose `tags()` include the requested tag when one is given, sorts by date, and formats them as today. The tag you pass goes through the same normalisation, so `--tag Errands` and `--tag '#errands'` both work. The sort-key fix from my last message goes in here (`r[0]` in place of `r[1]`). Python's sort is stable, so notes from the same day stay in the order they were added.

**Command line.** `main` keeps its hand-rolled parsing instead of moving to `argparse`, which would change the usage and error output for a single option. `list` accepts either no arguments or exactly `--tag <tag>`. An unknown option, a missing tag value, or extra arguments print the usage line and exit 2. The usage line becomes `usage: notes.py add <text> | list [--tag <tag>]`. If no notes match, `list` prints nothing and exits 0, the same as an empty store.

**Tests**, in `test_notes.py`, using the existing `tmp_path`/`monkeypatch.chdir` pattern:
- Sort order where text order and date order differ.
- `tags()` on several tags, mixed case, trailing punctuation, a bare `#`, and a `#` in the middle of a word like `a#b` (not a tag).
- `list_notes(tag=...)` covering filtering, case-insensitive matching, and a leading `#` on the argument.
- `main` returning 2 for `list --bogus`, for `list --tag` with no value, and for `list --tag a b`.

I'll also add a `list --tag errands` example to the README.

Should I go ahead and implement this?