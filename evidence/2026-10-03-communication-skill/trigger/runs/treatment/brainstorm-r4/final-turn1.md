This is a bounded change: `list` already exists in `notes.py` and the storage format stays the same. So I'll ask a few questions and then give you a short design here in chat, with no spec file or plan. If you think it's bigger than that, say so.

`docs/spec-tags.md` already covers most of the design: tags are `#word` inside the note text, the storage format doesn't change, `list --tag errands` filters case-insensitively, and unknown options print usage and exit 2. I'll use that as the starting point and only ask about what it leaves open.

One thing in the existing code affects this work. `list_notes()` sorts by note text (`key=lambda r: r[1]`), not by date. `test_list_is_in_date_order` only passes because its sample notes happen to be in the same order alphabetically and by date. Filtering will run through this function, so I'd like to fix the sort to use date as part of the change. Tell me if you'd rather keep that separate.

First question: what counts as part of a tag? The spec says "a word that starts with `#`", but that doesn't cover punctuation. In `call mom #family, then #errands.` a split on whitespace gives you the tags `family,` and `errands.`, so `--tag family` would miss that note.

- **Letters, digits, `-` and `_` (recommended).** The tag ends at the first other character, so `#family,` is the tag `family`. This matches how most tools read hashtags, and the rule is one regex.
- **Whitespace-delimited.** Everything up to the next space belongs to the tag. It's the simplest to implement, but trailing punctuation becomes part of the tag and filtering misses those notes.

Either one is easy to change later, because tags are parsed from the text every time `list` runs and nothing extra is stored. Which do you want?