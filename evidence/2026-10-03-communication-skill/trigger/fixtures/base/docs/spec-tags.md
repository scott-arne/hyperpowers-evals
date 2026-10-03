# Tags for notes

## Goal

A note can carry tags, and `list` can filter by one tag.

## Behavior

- A tag is a word in the note text that starts with `#`, for example `buy milk #errands`.
- A note can have any number of tags. Tags are stored as part of the text; the storage format does not change.
- `python notes.py list --tag errands` prints only notes that carry `#errands`. Matching is case-insensitive.
- `list` without `--tag` behaves as today.
- An unknown option prints the usage line and exits 2.

## Out of scope

Removing or renaming tags, multiple `--tag` options, and any storage change.
