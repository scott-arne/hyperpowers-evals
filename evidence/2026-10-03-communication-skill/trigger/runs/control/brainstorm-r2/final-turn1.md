This is a bounded change: `list` already exists and the change is a filter on it, so I'll keep the design in chat rather than write a new spec. Tell me if you'd rather treat it as bigger.

I read the repo first. `docs/spec-tags.md` already settles most of the design:

- Tags are `#word` tokens inside the note text, so the storage format doesn't change.
- `list --tag X` matches case-insensitively.
- One `--tag` at most.
- An unknown option prints the usage line and exits 2.

I'll treat that spec as the starting point and only ask about what it leaves open.

**Possible bug in the current code.** `list_notes()` sorts by note text (`key=lambda r: r[1]`), not by date. `test_list_is_in_date_order` only passes because its sample notes happen to be in alphabetical order as well. That will matter as soon as filtered output gets tested. Fixing it is a one-line change to sort by `r[0]`. I'd fold that into this work, unless sorting by text is what you actually want.

**First open question: what counts as part of a tag?** The spec says a tag is "a word that starts with `#`" but doesn't say where the word ends. That decides which of your existing notes a filter finds.

- **Whitespace-delimited:** everything from `#` to the next space is the tag. This is simplest, but `call mom #family.` stores the tag as `family.`, so `--tag family` won't find it. Easy to change later.
- **Letters, digits, `-` and `_`:** the tag stops at the first other character, so the trailing `.` or `,` is dropped and `#family.` matches `family`. It costs one small regex. Also easy to change later.

I recommend the second. Notes are free text, and a tag at the end of a sentence will often have punctuation after it. Under the first rule those notes would silently drop out of the filter.

Which rule do you want? Once that's settled, I'll ask the remaining small questions: whether `--tag #errands` should work too, and what happens when `--tag` has no value.