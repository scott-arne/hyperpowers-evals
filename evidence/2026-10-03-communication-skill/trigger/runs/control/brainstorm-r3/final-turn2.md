Here's the design. I filled in the open details myself and listed each one below so you can overrule any of them.

**How tags are read**

A new helper, `tags(text) -> set[str]`, returns the tags in a note, lowercased.
- A tag is a `#` at the start of a word, followed by letters, digits, `_` or `-`. The regex is `(?<!\S)#([\w-]+)`.
- Punctuation after a tag isn't part of it, so `#errands,` and `#errands.` both count as `errands`.
- A `#` in the middle of a word isn't a tag. `foo#bar` and `C#` are ignored, so URLs and similar text don't produce fake tags. A `#` on its own is ignored too.
- `notes.txt` keeps its current format. Tags stay in the note text and are printed as part of it.

**Filtering**

- `list_notes(tag: str | None = None)` keeps only the notes whose `tags(text)` include the lowercased tag.
- I also strip a leading `#` from the argument, so `--tag '#errands'` works the same as `--tag errands`.
- If no notes match, nothing is printed and the exit code is 0, the same as an empty list today.

**Command-line parsing**

- `main` stays hand-parsed like the rest of the file. It accepts `list` or `list --tag <tag>`.
- A missing tag value, an unknown option, or extra arguments print the usage line and exit 2.
- The usage line becomes `usage: notes.py add <text> | list [--tag <tag>]`.
- I chose not to use `argparse` because it would change the usage and error output for `add` as well. That's more than this feature needs.

**The sort bug (fixing it unless you say no)**

- `list_notes()` will sort by date (`r[0]`) instead of by text. The sort is stable, so notes from the same day keep the order they were added in.
- This changes what plain `list` shows, which goes slightly beyond adding tags. I'm including it because the filter goes into this same function and the existing test already expects date order.

**Tests** (in `test_notes.py`, same `tmp_path`/`monkeypatch` style)

- `tags()`: several tags in one note, punctuation after a tag, mixed case, a mid-word `#` that isn't a tag.
- `list_notes(tag=...)`: case-insensitive match, a leading `#` on the argument, no matches.
- `main`: `--tag` with no value exits 2, an unknown option exits 2.
- A date-order test whose dates and texts sort differently, so the sort bug can't hide again.

I'll write the tests first, then check the change with `pytest`, `ruff` and `mypy`. Should I go ahead?