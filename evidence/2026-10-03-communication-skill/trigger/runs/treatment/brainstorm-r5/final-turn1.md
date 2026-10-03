This looks bounded: `list` already exists in `notes.py`, and the change adds one option to it. I'll ask a few questions and then give a short design here in chat. I won't write a separate spec file. Tell me if you'd rather go the heavier route.

You already have `docs/spec-tags.md`, so I'm treating that as the starting point. It settles the main decisions: tags are `#word` inside the note text, the storage format stays the same, there's a single `--tag`, matching ignores case, and an unknown option exits 2.

I found two things in the code that affect the design:

- `list_notes()` sorts by the note text (`key=lambda r: r[1]`), not by date. `test_list_is_in_date_order` passes only because apple, mango, zebra happen to be in both alphabetical and date order. Filtering will reuse that function, so I think we should fix the sort to use the date as part of this work. Otherwise, the filtered list will come out alphabetical.
- At the moment, `list` ignores any extra arguments, so `list --foo` prints everything. The spec's "unknown option exits 2" rule means `list` needs real argument handling for the first time.

First question: where does a tag end? The spec says "a word starting with `#`", but notes are free text, so `#errands.` or `(#work)` will show up.

- **A. Letters, digits, `-` and `_` only.** I recommend this. A tag ends at the first other character, so `#errands.` is the tag `errands`. This covers how people write tags in sentences. Changing the rule later is easy because it only affects matching, not stored data.
- **B. Everything up to the next space.** `#errands.` would be the tag `errands.`, which `--tag errands` wouldn't match. That's simpler to explain, but punctuation would cause missed matches without any warning.

Do you want A or B?