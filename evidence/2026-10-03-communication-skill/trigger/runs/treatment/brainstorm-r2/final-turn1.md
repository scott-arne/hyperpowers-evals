This looks bounded: `list` and the argument handling already exist in `notes.py`, and the change touches only that flow. So I'll put a short design in chat once we've settled a few questions, and I won't write a spec file. Tell me if you'd rather go the heavier route.

`docs/spec-tags.md` already covers most of the design:

- Tags are `#words` inside the note text, so `notes.txt` keeps its current format.
- `list --tag errands` filters case-insensitively.
- An unknown option prints usage and exits 2.
- Multiple `--tag` options and renaming tags are out of scope.

I found a bug you should know about before we touch `list`. `list_notes()` sorts by the note text (`key=lambda r: r[1]`), not by date. `test_list_is_in_date_order` still passes only because its sample notes happen to be in the same order alphabetically and by date. A filtered list would show the bug as well, so I'll ask later whether to fix it in this change or separately.

First question: is `docs/spec-tags.md` still what you want, or has your thinking changed since you wrote it? If it stands, I'll move on to what it leaves open: how a tag ends when punctuation follows it (`#errands,`), and whether `--tag #errands` with the `#` should also work.