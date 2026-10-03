`python notes.py add <text>` adds a line to the end of `notes.txt` in the current working directory. It creates the file if it doesn't exist (`notes.py:9-11`).

- **Input:** it joins every argument after `add` with single spaces, so `add buy milk` and `add "buy milk"` save the same note.
- **Line format:** each line is `<today's ISO date>\t<text>\n`, for example `2026-10-03	buy milk`.
- **Exit code:** it always returns 0. It prints nothing.

Some edge cases you might trip over:

- **No text:** `python notes.py add` with nothing after it still writes a line, containing just the date and a tab.
- **Tabs and newlines:** text is written exactly as given. A newline in the note splits it into two lines when read back, and the second line gets read with its first tab-separated part as the date. A tab inside the text is safe, because `load()` splits only on the first tab.
- **File location:** `notes.txt` is a relative path, so it's created in whatever directory you run the command from, not next to the script.