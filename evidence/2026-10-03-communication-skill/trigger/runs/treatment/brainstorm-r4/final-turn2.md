Here's the design. I made the remaining calls myself, and the ones you might want to change are noted below. It touches `notes.py`, `test_notes.py`, and one line in the README.

**Parsing tags.** A new function, `tags(text) -> set[str]`, finds each word that starts with `#` and returns the tags lowercased. A tag is the `#` followed by letters, digits, `-` or `_`, and it ends at the first other character. That way `#family,` counts as `family`. The `#` must be at the start of the text or after a space, so `C#` and `a#b` are not tags. Tags are read from the text every time `list` runs, and nothing new is stored in `notes.txt`.

**Filtering.** `list_notes()` takes an optional tag: `list_notes(tag: str | None = None)`. With no tag it returns every note, as it does now. With a tag it keeps only the notes whose tag set contains that tag, lowercased. A leading `#` is stripped first, so `--tag errands` and `--tag '#errands'` give the same result. Output lines don't change format.

**Sort fix.** `list_notes()` will sort by date instead of by note text. Notes with the same date keep the order they were added in.

**Command line.** I'll extend the current hand-written parsing in `main()` rather than switch to `argparse`, which would replace the usage and error output the tool prints now. These forms are accepted:

- `list`
- `list --tag X`

These print the usage line and exit 2:

- `--tag` with no value
- any other option, such as `list --foo`
- extra arguments after `list`

The usage line becomes `usage: notes.py add <text> | list [--tag TAG]`. `add` doesn't change, so `notes.py add "buy milk #errands"` already stores a tagged note.

**Tests.** Each change gets a test, written before the code:

- `tags()` with punctuation after a tag, several tags in one note, mixed case, and a `#` in the middle of a word
- filtering that matches regardless of case, and with a leading `#` on the tag
- a tag that matches no notes, which prints nothing and exits 0
- `--tag` with no value, and an unknown option, both exiting 2
- a corrected date-order test whose sample notes sort differently by date than by text, so it would have caught the current sort bug

I'll run `pytest`, `ruff`, and `mypy` on the result.

Two things are open to change. I stop a tag at punctuation, where your description ("any word that starts with #") could also mean the tag runs to the next space. And I included the sort fix in this change rather than doing it separately. Should I go ahead with this design?