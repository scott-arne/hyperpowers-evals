This looks bounded: `list` already exists in `notes.py`, and the change adds a flag to it. I'll ask a few questions and then give you a short design here in chat. I won't write a new spec file.

There's already a spec at `docs/spec-tags.md`. It says tags are `#word` tokens inside the note text, so the storage format stays the same. It adds `list --tag errands` with case-insensitive matching, and an unknown option prints usage and exits 2. It leaves out multiple `--tag` options and tag removal.

Separately, I found a bug while reading the code. `list_notes()` sorts by note text (`key=lambda r: r[1]`), not by date. `test_list_is_in_date_order` still passes because its fixture happens to be in alphabetical order (apple, mango, zebra). Filtering will run on top of this sort, so I'd fix it in the same change unless you'd rather keep it separate.

First question: is `docs/spec-tags.md` still what you want? Or are you rethinking any of it, such as storing tags in their own field instead of inline `#word` tokens? That's the decision that's hardest to undo, because it changes what's in `notes.txt`.