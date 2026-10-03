This looks bounded: `list` already exists, and `docs/spec-tags.md` keeps tags inside the note text, so the storage format doesn't change. I'll ask a few questions, then give you a short design here in chat for approval. I won't write a separate spec file or plan.

What I found:

- **The spec already covers most of it.** It defines tags as `#word` in the text, adds `list --tag X` with case-insensitive matching, and says an unknown option exits 2. It also leaves out multiple tags and tag editing.
- **`list` ignores extra arguments today.** `notes.py list --bogus` prints everything. "Unknown option exits 2" is new behaviour, so I'll design and test it explicitly.
- **There's a bug you should know about.** `list_notes` sorts by the note text (`key=lambda r: r[1]`), not by the date. `test_list_is_in_date_order` only passes because apple, mango and zebra happen to be in date order too. A tag filter test with other data would expose it. I think we should fix the sort to use the date as part of this work, but that's your call, and I'll keep it separate from the tag change if you'd prefer.

**First question: where does a tag end?** Spaces separate words, but punctuation is the unclear part. Take `call mom #family, then #errands.`:

- **A. Letters, digits, `-` and `_` only** (recommended). The tag ends at any other character, so `#family,` is the tag `family`. This matches what people mean when they write a sentence, and `#` inside a word (`C#`, `foo#bar`) isn't a tag.
- **B. Everything up to the next space.** `#family,` is the tag `family,`, so `--tag family` wouldn't match it. It's simpler to implement but surprising in real notes.

Once notes have tags, changing this rule changes which old notes match a filter, so it's worth settling now. A is my recommendation. Which do you want?