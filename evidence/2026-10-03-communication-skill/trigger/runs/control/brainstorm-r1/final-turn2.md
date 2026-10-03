Here's the design. I made the calls you left to me and noted each one.

**Tag rule**

A tag is `#` followed by letters, digits, `_` or `-`. The tag ends at the first other character, so `call mom #family, then #errands.` has the tags `family` and `errands`. A `#` in the middle of a word (`C#`, `foo#bar`) doesn't start a tag. In code this is one regex, `(?<![\w#])#([\w-]+)`, plus a small `tags(text) -> set[str]` helper that lowercases what it finds. Tags stay in the note text and the file format doesn't change.

**Filtering**

`list_notes(tag: str | None = None)` keeps a note only if the lowercased tag is in `tags(text)`. That makes `--tag Errands` match `#errands`, and `--tag err` not match it. I'll strip one leading `#` from the argument, so `list --tag '#errands'` also works; people will type it that way. If nothing matches, the output is empty and the exit code is 0.

**Command line**

- `list` takes either no arguments or exactly `--tag <tag>`.
- Anything else exits 2 and prints the usage line: an unknown option, `--tag` with no value or an empty one, a second `--tag`, or a stray word.
- The usage line becomes `usage: notes.py add <text> | list [--tag <tag>]`.
- I'll parse the arguments by hand rather than bring in `argparse`. `main` already works that way, and with one option `argparse` would change how existing errors look.

**Sort fix**

I'll change the sort key from the text to the date. As noted earlier, `list` sorts alphabetically today and the test only passes by coincidence. Filtering makes that more visible, and it's a one-line change. It goes in its own commit, separate from the tag work.

**Files**

- `notes.py`: the regex, `tags()`, the `tag` parameter on `list_notes`, and argument handling for `list`.
- `test_notes.py`: tests written first:
  - punctuation, mid-word `#`, several tags, and case in `tags()`
  - `list_notes(tag=...)` filtering, including no matches and a leading `#`
  - `main` exit codes for `--tag x`, `--tag` with no value, `--bogus`, and two `--tag` options
  - a date-order test whose text order differs from its date order
- `README.md`: one usage example.
- `docs/spec-tags.md`: unchanged. The design is consistent with it.

I'll run pytest, ruff and mypy at the end.

Does this look right? If so, I'll implement it.