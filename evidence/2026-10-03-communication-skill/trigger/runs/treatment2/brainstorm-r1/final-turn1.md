This looks bounded: `list` already exists in `notes.py` and the change adds one filter to it, so I'll ask a few questions and then give you a short design in chat. I won't write a separate spec file. Nothing gets coded until you approve that design.

There's already a spec, `docs/spec-tags.md`, and it settles most of the design:
- Tags are `#words` inside the note text, so `notes.txt` keeps its current format.
- `list --tag errands` shows only notes tagged `#errands`, and matching ignores case.
- An unknown option prints the usage line and exits with status 2.
- Removing or renaming tags, passing more than one `--tag`, and any storage change are out of scope.

I also found a bug in the code you'll be changing. `list_notes()` sorts on the note text (`key=lambda r: r[1]`), not the date. `test_list_is_in_date_order` still passes because its sample notes (apple, mango, zebra) are in the same order alphabetically as by date. Tag filtering runs inside that same function, so I'd fix the sort and add a test where text order and date order differ. That's a one-line change, but it does change the order `list` prints today, so I want your OK first.

Before the details, one question: is `docs/spec-tags.md` still what you want, or should we treat it as a draft and revisit some of its decisions? If it stands, the next thing to settle is how a tag is recognized. For example, does `#errands,` count as `errands`, and does `C#` count as a tag?