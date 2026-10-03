Here's the design. Nothing is implemented yet. I'll start once you say yes.

**Changes to `notes.py`**

1. Add a `tags(text) -> set[str]` helper. It splits the note text on whitespace and keeps each word that starts with `#`. For each one it removes the `#`, strips trailing punctuation (`.,;:!?)`), and lowercases it. If nothing is left (a lone `#`), it isn't a tag. So `buy milk #errands, #Home` has the tags `{"errands", "home"}`. I added the punctuation stripping myself. A tag at the end of a sentence would otherwise be stored as `errands.`, and `--tag errands` would silently miss that note. If you want the literal rule, drop that one step.
2. `list_notes(tag: str | None = None)` filters to notes whose `tags()` contain the lowercased tag. It also sorts by date instead of by text, which fixes the bug I mentioned. The output format stays `<date>  <text>`.
3. `main()` handles three forms of `list`. `list` on its own prints every note, as it does now. `list --tag X` filters. Anything else prints the usage line and exits 2: a missing value, an unknown option, or extra arguments. The usage line becomes `usage: notes.py add <text> | list [--tag <tag>]`. `--tag #errands` works the same as `--tag errands`, because I strip a leading `#` from the value. I'll parse the arguments by hand instead of using argparse. There's only one option, and hand parsing keeps the usage line and exit code exactly as they are now.

**Tests in `test_notes.py`**

- `tags()`: several tags in one note, mixed case, trailing punctuation, a lone `#`, and `C#`, which isn't a tag because its `#` doesn't start the word.
- `list_notes(tag=...)`: the filter only returns matching notes, matching ignores case, and a tag with no matches returns an empty list.
- Date order: a fixture where text order and date order differ, so the sort fix is actually tested.
- `main()`: `list --tag` with no value, an unknown option, and extra arguments each return 2.

I'll also add a `list --tag errands` example to `README.md`. Then I'll run `pytest`, `ruff`, and `mypy` on the two Python files.

Should I go ahead?