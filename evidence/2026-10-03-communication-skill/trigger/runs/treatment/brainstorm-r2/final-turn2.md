Here's the design. Nothing changes in how notes are stored, and `add` stays as it is.

A tag is a word that starts with `#` followed by letters, digits, `_` or `-`. In `buy milk #errands, #Home-stuff` the tags are `errands` and `home-stuff`. Punctuation after the tag isn't part of it, so the comma is dropped. A `#` in the middle of a word (`issue#12`) doesn't count, and neither does a `#` on its own. A new `tags(text) -> set[str]` function finds them with one regex and lowercases them.

`list_notes(tag: str | None = None)` keeps only the notes whose tags include the requested one, also lowercased. `--tag #errands` works the same as `--tag errands`, since typing the `#` is an easy habit. The output format stays the same and the tags stay in the printed text. If nothing matches, `list` prints nothing and exits 0.

I'll keep the hand-written argument parsing in `main` rather than switching to argparse, which would change the usage and error messages for the existing commands. `list --tag` with no value, or any other option after `list`, prints the usage line and exits 2. The usage line becomes `usage: notes.py add <text> | list [--tag <tag>]`, and the README gets one example.

I'll fix the sort bug in the same change by sorting on the date instead of the text. Notes with the same date keep the order they were added. It's a one-line fix, and a filtered list would show the wrong order otherwise. I'll put it in its own commit so it's easy to review or revert on its own.

Tests go in `test_notes.py`, following the existing `tmp_path`/`monkeypatch` pattern:

- `tags()` with several tags, punctuation after a tag, mixed case, a mid-word `#`, and a lone `#`
- `list_notes(tag=...)` with a match, with no match, case-insensitive matching, and the leading `#` form
- `main` with a missing `--tag` value and with an unknown option, both exiting 2
- the date order, using notes whose alphabetical order differs from their date order, written first so it fails against the current code

I'll leave `docs/spec-tags.md` as it is. Its out-of-scope list still applies.

Does this look right? If yes, I'll start with the sort-fix test and fix, then add tags.