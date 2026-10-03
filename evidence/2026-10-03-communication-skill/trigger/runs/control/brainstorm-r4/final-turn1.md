I'm treating this as **bounded**: `list` already exists in `notes.py`, and this adds one flag to it. So the plan is a short design here in chat, then your approval, and no new spec or plan files. If you think it deserves the full spec process, say so.

The existing `docs/spec-tags.md` already settles most of the design:

- **Where tags live:** a tag is a `#word` inside the note text, so the storage format doesn't change.
- **The new flag:** `list --tag errands` filters on one tag, and matching ignores case.
- **Errors:** an unknown option prints usage and exits 2.
- **Out of scope:** removing or renaming tags, multiple `--tag` flags, and storage changes.

I found two things in the current code that affect this work:

1. **`list` sorts by note text, not by date.** In `list_notes`, the sort key is `r[1]`, which is the text. `test_list_is_in_date_order` only passes because apple, mango and zebra happen to be in date order too. A filtered list will make this more visible. I'd fix it in the same change by sorting on `r[0]`, the date, and adding a test that fails today. Say if you'd rather keep that separate.
2. **`list` ignores extra arguments today.** `list --bogus` prints everything. The spec's "unknown option exits 2" rule changes that, which is fine; I'm just flagging that the behavior changes.

**First open question: where does a tag end?** This decides whether `buy milk #errands,` or `call mom (#family)` counts as tagged. It only affects matching, not storage, so it's cheap to change later.

- **A. Whitespace only:** split on spaces and keep tokens that start with `#`. This is the simplest option, but `#errands,` becomes the tag `errands,` and won't match `--tag errands`.
- **B. Letters, digits, `_` and `-` after `#` (regex `#([\w-]+)`):** trailing punctuation and brackets aren't part of the tag, so both examples above match. It costs one regex. A side effect is that `#` followed by punctuation, like `#!`, isn't a tag.
- **C. Whitespace split, then strip trailing punctuation:** this mostly behaves like B but is harder to state as a rule.

I recommend **B**. Notes are free text, so punctuation next to a tag will happen, and silently missing those notes is the kind of failure you wouldn't notice. A regex is also the easiest of the three to explain and test.

Which do you want: A, B or C?