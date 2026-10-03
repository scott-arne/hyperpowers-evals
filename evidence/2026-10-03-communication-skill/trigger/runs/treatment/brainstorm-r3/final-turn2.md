Here's the design. It follows the spec and your definition. Nothing gets written until you approve it.

**Finding tags.** I'll add `tags(text: str) -> set[str]` to `notes.py`. It splits the text on whitespace and keeps each word that starts with `#`, without the `#`, lowercased. A lone `#` isn't a tag. A word is exactly what the whitespace split gives, so `#family,` produces the tag `family,`, as you specified. Tags are read from the text each time `list` runs, so `notes.txt` and `add` stay as they are.

**Filtering.** `list_notes()` gets an optional `tag: str | None = None`. If it's set, the function lowercases the value, removes one leading `#`, and keeps only rows whose `tags()` contain it. Removing the `#` means `--tag errands` and `--tag '#errands'` match the same notes. Without a tag, `list_notes()` returns exactly what it returns now.

**Command line.** `main()` handles `list` with no extra arguments the same as today, and handles `list --tag <name>` as the filter. Anything else after `list` prints the usage line and exits 2: an unknown option, `--tag` with no value, or a second `--tag`. The usage line becomes `usage: notes.py add <text> | list [--tag <name>]`. I'll parse the arguments by hand in about five lines, the same way `add` is handled now. Bringing in `argparse` for one option would mean rewriting `main()`, and its default exit codes and messages wouldn't match the spec.

**Tests.** These go in `test_notes.py`, using the existing `tmp_path`/`monkeypatch.chdir` setup:

- `tags()` with several tags, mixed case, and a lone `#`
- `list_notes(tag=...)` with a case-insensitive match, a leading `#` on the filter, and a filter that matches no notes
- `main()` exit codes: `list --tag x` returns 0, while `list --bogus` and `list --tag` with no value return 2

The date-order sorting problem from my last message stays out of this change, and filtered output will keep the current text order. Before I start, decide whether you want that fixed as a separate change.

If this design looks right, say yes and I'll start, writing the tests first.