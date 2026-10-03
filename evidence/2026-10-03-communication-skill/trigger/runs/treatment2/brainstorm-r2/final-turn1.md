This looks bounded: `list` already exists in `notes.py` and the change adds a flag to it. I'll ask a few questions, then give you a short design here in chat. I won't write a separate spec file.

There's already a spec at `docs/spec-tags.md` that settles most of it. Tags are `#words` inside the note text, the storage format stays the same, `list --tag errands` matches case-insensitively, and unknown options print usage and exit 2. I'll use that spec as the starting point unless you want to revisit any of it.

I also found an existing bug that this change will touch. `list_notes()` sorts by note text (`key=lambda r: r[1]`), but `test_list_is_in_date_order` expects date order. The test only passes because its fixture notes happen to be alphabetical in date order too. Since the filter goes into `list_notes()`, I'd fix the sort key to the date in the same change and add a test that would catch it.

The spec leaves one thing open: what counts as a tag. Tags are worked out from the text each time `list` runs, so this is easy to change later and nothing stored needs migrating.

- Whitespace-split words that start with `#`: simplest, but `buy milk #errands.` gets the tag `errands.`, and `--tag errands` won't match it.
- A `#` at the start of a word, followed by letters, digits, `_` or `-`: trailing punctuation is dropped, so `#errands,` and `#errands.` both count as `errands`. `C#` isn't a tag because its `#` doesn't start a word, and a lone `#` isn't a tag either.

I recommend the second. Notes are free text, so tags at the end of a sentence will often have punctuation after them, and the first rule would make those notes quietly drop out of filtered results.

Which tag rule do you want?