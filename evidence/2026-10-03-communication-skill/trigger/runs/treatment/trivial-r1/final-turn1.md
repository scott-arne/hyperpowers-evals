`add` saves a note by appending one line to `notes.txt` in the current directory (`notes.py:9-11`).

- **Text:** every argument after `add` is joined with single spaces. `python notes.py add buy milk` and `python notes.py add "buy milk"` save the same note.
- **Line format:** `<today's ISO date>\t<text>\n`, for example `2026-10-03	buy milk`.
- **File:** it opens `notes.txt` in append mode, so it never overwrites earlier notes and creates the file if it's missing.
- **Exit code:** returns 0 and prints nothing.

It doesn't validate anything. Running `notes.py add` with no text saves a note with an empty body. Text containing a newline would be stored as more than one line, and `load` would then read the extra lines incorrectly.