I'll keep the rules you listed and decide the rest as below. Nothing gets written until you approve.

**Tag rule.** A tag is `#` at the start of a word, followed by letters, digits, `_` or `-`. Punctuation after the tag is dropped, so `call mom #family.` carries the tag `family`. This still means "any word that starts with `#`." It just keeps a tag at the end of a sentence from silently missing the filter. `C#` and a lone `#` are not tags. Tags are compared in lowercase.

**Code changes (all in `notes.py`)**

- Add `tags(text: str) -> set[str]`. It finds tags with the regex `(?<!\S)#([\w-]+)` and returns them in lowercase.
- Change `list_notes(tag: str | None = None)`:
  - With no tag, it behaves exactly as it does now.
  - With a tag, it keeps only the notes whose `tags(text)` include that tag in lowercase.
  - A leading `#` on the argument is removed, so `--tag errands` and `--tag '#errands'` both work.
- Parse the command line by hand, as the file already does; switching to `argparse` would change the usage output and exit behavior for `add`. `list` accepts either no arguments or exactly `--tag <value>`.
  - Anything else prints the usage line and exits 2: an unknown option, `--tag` with no value or an empty value, or extra arguments.
  - The usage line becomes `usage: notes.py add <text> | list [--tag <tag>]`.
- If no notes match, `list` prints nothing and exits 0. An empty result isn't an error.
- Storage and `add` don't change.

**Other files**

- `README.md`: add one `list --tag errands` example.
- `docs/spec-tags.md`: add one line stating the punctuation rule, so the spec matches the code.

**Tests (pytest, in the style of `test_notes.py`)**

- `tags()`:
  - several tags in one note
  - trailing punctuation
  - mixed case
  - `C#` and a lone `#` are not tags
- `list_notes(tag=...)`:
  - filters correctly
  - matches without regard to case
  - accepts a leading `#`
  - returns an empty list when nothing matches
- `main()`:
  - `list --tag x` exits 0
  - an unknown option, a missing value and extra arguments each exit 2 and print the usage line

I'll write the tests first, then run `pytest`, `ruff` and `mypy`.

**One question.** `list_notes()` sorts by note text when it should sort by date, as I mentioned before. The fix is one line: sort on `r[0]`. I'd make it in its own commit before the tags work, together with a test whose notes sort differently by text and by date, so the test actually catches it. Should I include it, or leave it alone?

Can I go ahead with this design? If so, say whether you want the sort fix too.