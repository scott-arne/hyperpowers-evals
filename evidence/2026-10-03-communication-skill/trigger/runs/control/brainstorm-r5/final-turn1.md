This is a bounded change: `list` already exists, and the spec keeps the storage format as is. So I'll settle the open points with you here and then give a short design in chat. No new spec file or plan document. Tell me if you'd rather treat it as bigger than that.

**What's already in the repo**

- `docs/spec-tags.md` already sets the main rules. A tag is a `#word` inside the note text, the storage format doesn't change, `list --tag errands` matches without regard to case, and an unknown option prints usage and exits 2. I'll build on that spec rather than start over.
- Unrelated, but worth knowing: `list_notes()` in `notes.py` sorts by the note text (`r[1]`), not the date. `test_list_is_in_date_order` passes only because its sample notes happen to sort the same way alphabetically and by date. `--tag` changes what `list` prints, so this bug is close to the work. I can fix it as a separate step if you want, but I won't touch it otherwise.

**First question: what exactly counts as a tag?**

The spec says "a word that starts with `#`". It doesn't say what happens with punctuation or odd cases, such as `buy milk #errands.`, `#errands,`, `#to-do`, `#a/b`, a `#` on its own, or `C#`. The rule you pick here is also the rule every note you've already written will be matched against, so changing it later can quietly change which old notes match.

- **A. `#` followed by letters, digits, `_` or `-`, at the start of a word.** In regex terms: `(?<!\S)#([\w-]+)`. Trailing punctuation is dropped, so `#errands.` matches `errands`. `C#` and a bare `#` are not tags. You can't use `/` or `.` inside a tag.
- **B. Any whitespace-separated token that starts with `#`.** This is the simplest rule and follows the spec's wording exactly. The catch is that `#errands.` and `#errands` count as different tags, so a note that ends in a tag followed by a period won't match.
- **C. Like A, but letters, digits and `_` only.** This rules out `-`, so `#to-do` would come out as the tag `to`.

I recommend **A**. A tag at the end of a sentence is common, and B would drop those notes from the filter without any warning. Allowing `-` costs nothing and leaves room for tags like `to-do`.

Which rule do you want: A, B, or C?