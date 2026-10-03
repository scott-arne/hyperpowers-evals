This looks **bounded**: `list` already exists in `notes.py` and the change adds a filter to it. So I'll ask a few questions, give you a short design in chat, and wait for your go-ahead before writing any code. No spec file or plan document. Tell me if you'd rather treat it as bigger.

What I found:

- **There's already a spec, `docs/spec-tags.md`.** It says tags are `#words` inside the note text, so the storage format stays the same. `list --tag errands` filters case-insensitively. An unknown option prints usage and exits 2. Removing or renaming tags, multiple `--tag` options, and storage changes are out of scope.
- **`list` sorts by the wrong field.** `list_notes()` sorts by the note text (`r[1]`), not the date, even though the test is called `test_list_is_in_date_order`. The test only passes because its sample data happens to be in the same order alphabetically and by date. The filter will go into `list_notes()`, so this is worth deciding now: fix it in this change, or leave it for a separate one.

First question: **is `docs/spec-tags.md` still what you want, or are you rethinking any of it?**

The main decision in it is keeping tags inline as `#word` in the text, and that's the hard one to undo. Inline tags need no change to the file format and work with every existing note. The cost is that tags can't be separated from the text later without parsing it. A separate tag column in `notes.txt` would keep them apart, but every existing line would have to handle a missing column, and the spec rules out storage changes. I'd keep the inline approach.

If the spec stands, I'll go on to the smaller details it leaves open, starting with how to handle punctuation after a tag (`#errands,`).