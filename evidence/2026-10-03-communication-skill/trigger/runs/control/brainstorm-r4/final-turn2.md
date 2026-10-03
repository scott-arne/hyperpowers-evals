Here's the design. I've made the remaining calls myself and marked them so you can overrule any of them.

**What counts as a tag**
- A tag is `#` followed by letters, digits, `_` or `-`, matched with the regex `#([\w-]+)`. That means `#errands,` and `(#family)` both count, and trailing punctuation isn't part of the tag. *(My call: a plain split on whitespace would quietly miss notes where punctuation follows the tag.)*
- Tags are compared in lowercase, so `#Errands` matches `--tag errands`.
- A note can have any number of tags. The text is stored exactly as typed and `notes.txt` doesn't change.

**Changes in `notes.py`**
- New `tags(text: str) -> set[str]` returns a note's tags in lowercase. It's a separate function so it can be tested on its own.
- `list_notes(tag: str | None = None)`: with no tag it behaves as today; with a tag it keeps only notes where `tag.lower()` is in `tags(text)`.
- `main` parses the arguments after `list`:
  - Nothing after `list`: list everything.
  - `--tag <value>`: filter on that tag. A leading `#` is accepted, so `--tag '#errands'` works too. *(My call: it's an easy mistake to make.)*
  - Anything else, including `--tag` with no value or an extra argument: print the usage line and exit 2.
- The usage line becomes `usage: notes.py add <text> | list [--tag <tag>]`.
- I'm not adding `argparse`. The file parses arguments by hand, and one flag doesn't justify switching.

**Sort fix, included in this change**
- `list_notes` currently sorts by note text; I'll change it to sort by date. *(My call: filtered output is where text order would be obviously wrong.)*

**Tests in `test_notes.py`**
Each test is written before the code it covers:
- `tags()` handles several tags, punctuation next to a tag, mixed case, and text with no tags.
- `list --tag` filters, ignores case, and accepts a leading `#`.
- `list` without a tag still lists everything.
- Unknown option, missing `--tag` value and an extra argument each exit 2 with the usage line.
- A sort test whose dates aren't in alphabetical order. It fails on the current code.

**Out of scope, as in `docs/spec-tags.md`:** removing or renaming tags, more than one `--tag`, `--tag=value` syntax, and any storage change.

Only `notes.py` and `test_notes.py` change. Should I go ahead?