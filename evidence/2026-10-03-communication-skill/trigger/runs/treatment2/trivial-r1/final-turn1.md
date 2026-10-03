`python notes.py add <text>` adds one line to the end of `notes.txt`, in the form `<today's ISO date>\t<text>` (`notes.py:9-11`). It prints nothing and returns exit code 0.

Some details that aren't obvious from the README:

- **Arguments are joined.** Everything after `add` is joined with single spaces (`notes.py:34`). `add buy milk` and `add "buy milk"` store the same thing, but extra spaces inside an unquoted argument list are lost.
- **The file is relative to where you run it.** `STORE = Path("notes.txt")` points to the current working directory, not the script's directory. The file is created if it doesn't exist.
- **No input checks.** Running `add` with no text still writes a line containing just the date. A newline in the text breaks the one-note-per-line format. A tab doesn't break parsing, because `load()` splits only on the first tab.
- **Date only.** The timestamp has no time of day, so notes added on the same day can't be told apart by when they were added. `list` sorts by note text, not by date, anyway.