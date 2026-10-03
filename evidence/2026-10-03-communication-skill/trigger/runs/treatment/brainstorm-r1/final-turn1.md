This is a bounded change. `list` already exists in `notes.py`, and the storage format stays the same, so I'll ask a few questions and then give you a short design here in chat. No separate spec file.

The repo already has a design in `docs/spec-tags.md`:
- A tag is any word starting with `#`, kept inside the note text.
- `list --tag errands` shows only notes with that tag, ignoring case.
- An unknown option prints usage and exits 2.
- Removing tags, repeating `--tag`, and storage changes are out of scope.

I'd start from that document and settle the details it leaves open, such as whether `#errands,` with trailing punctuation counts as the tag `errands`.

There's also a bug in the code `--tag` will filter. `list_notes()` sorts by note text (`key=lambda r: r[1]`) when it should sort by date. `test_list_is_in_date_order` still passes because its three notes happen to come out in the same order either way. Filtering won't change the sort order, but tests for `--tag` would pick up the wrong order. I'd fix the sort key in the same change and add a test where text order and date order differ.

First question: is `docs/spec-tags.md` still what you want, or do you want to revisit any of it before we fill in the gaps?