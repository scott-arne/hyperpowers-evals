Here's the design. Your rules are fixed: a tag is any `#word` in the text, a note can have several, `--tag` matching is case-insensitive, and storage doesn't change. I've made the calls on everything else; any of them is easy to change.

**What counts as a tag.** A tag starts with `#` at the beginning of a word and runs over letters, digits, `-` and `_`. Any other character ends it.
- `call mom #family.` is tagged `family`, without the dot.
- `C#` and `a#b` aren't tags, because the `#` isn't at the start of a word.

**The filter.** `list --tag errands` prints only notes that have that tag, compared in lowercase.
- A leading `#` on the argument is also accepted, so `--tag #errands` works. In most shells you'd have to quote it, but it costs nothing to support.
- It's an exact tag match: `--tag err` doesn't match `#errands`.
- If no notes match, it prints nothing and exits 0, the same as an empty list today.

**Errors.** All of these print the usage line and exit 2:
- `--tag` with no value after it
- any other option, such as `list --foo`
- extra words after `list`

The usage line becomes `usage: notes.py add <text> | list [--tag <tag>]`. `add` doesn't change, so `add "pick up #Errands"` stores the text exactly as typed.

**Code** (all in `notes.py`):
- New `tags_of(text) -> set[str]`: one regex, returns the tags in lowercase.
- `list_notes(tag: str | None = None)`: filters the loaded notes with `tags_of` before formatting them.
- `main()`: parses `list [--tag X]` by hand, in the same style as the existing argument handling. I chose this over `argparse` because `argparse` would replace the current usage text and error output with its own.
- Sorting fix: sort by date instead of text, as I flagged earlier. Without it, filtered results would come out in alphabetical order.

**Tests** (in `test_notes.py`, run with pytest):
- `tags_of`: several tags in one note, trailing punctuation, mixed case, and the `C#` case.
- The filter: matches, misses, case-insensitivity, `--tag #x`, and no matches.
- `main()` exit codes: missing value and unknown option both give 2.
- Date order: a case where alphabetical and date order differ, to pin down the sorting fix.

Code is checked with ruff and mypy.

**Docs.** One example line in `README.md`. `docs/spec-tags.md` already describes this behavior, so it stays as it is.

Does that look right? Once you say yes I'll implement it, writing the tests first. Nothing gets committed unless you ask.