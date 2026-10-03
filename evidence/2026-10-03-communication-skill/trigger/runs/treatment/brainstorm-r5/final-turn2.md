Here is the design. For the open questions I went with the letters/digits/`-`/`_` rule for where a tag ends. I also included a fix for the sort bug, because it changes what `list` prints.

Tag parsing goes in a new function, `tags(text) -> set[str]`. It finds every `#` followed by letters, digits, `-` or `_` (regex `#([\w-]+)`) and returns the names in lowercase. So `buy milk #Errands #home.` has the tags `errands` and `home`. A bare `#` or `#!` is not a tag. Nothing changes in storage: `add` writes the text exactly as typed, tags included.

For filtering, `list_notes()` gets an optional `tag` parameter. Without it, the function returns every note. With it, the function keeps only notes where `tag.lower()` is in `tags(text)`. A leading `#` in the argument is dropped, so `--tag '#errands'` and `--tag errands` do the same thing. If nothing matches, it prints nothing and exits 0. Each line still shows the full note text, tags included.

Sorting: I'll change the sort key from the note text to the date. Python's sort keeps equal items in their original order, so notes from the same day stay in the order they were added. If you'd rather keep the alphabetical sort, say so and I'll drop this part. As it stands, filtered results would come out alphabetical.

Argument handling: `list` accepts either no arguments or exactly `--tag <name>`. Anything else prints the usage line and exits 2. That covers an unknown option, `--tag` with no value, and extra words. The usage line becomes `usage: notes.py add <text> | list [--tag <tag>]`. I'll keep the hand-written parsing that's already there instead of switching to argparse. With only one option, argparse would replace the existing usage and error output for very little benefit.

Files touched:
- `notes.py`
- `test_notes.py`
- The usage example in `README.md`
- `.gitignore`: adding `docs/hyperpowers`, which your CLAUDE.md asks for.

`docs/spec-tags.md` is already tracked, and I'll leave it as it is.

Tests come first, written to fail before the change:
- `tags()` with punctuation, mixed case, several tags and a bare `#`
- `--tag` filtering, including case-insensitive matches and a note with several tags
- Results come out in date order, using data where alphabetical and date order differ. The current test can't tell the two apart.
- `list` with no option is unchanged
- Exit 2 for an unknown option, a missing value, and extra arguments

I'll run pytest, ruff and mypy at the end.

Shall I go ahead with this, with or without the sort fix?