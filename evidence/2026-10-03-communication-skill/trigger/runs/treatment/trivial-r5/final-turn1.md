`add` appends one note to `notes.txt` (`notes.py:9-11`).

    python notes.py add buy milk

This writes a line like `2026-10-03\tbuy milk` and exits with status 0.

How it works:
- `main` joins every argument after `add` with single spaces (`notes.py:33-35`), so `add buy milk` and `add "buy milk"` save the same text. Quoting only matters if you want to keep runs of spaces or other whitespace.
- The date is today's local date in ISO format, then a tab, then the text. The file is opened in append mode and created if it doesn't exist.
- `STORE` is a relative path, so the file goes in whatever directory you run the command from, not next to the script.

Edge cases:
- `python notes.py add` with no text still writes a line containing just the date.
- Text containing a newline gets split across lines in the file. `load()` would then read the second part as a separate note with a bogus date.
- A tab inside the text is fine. `load()` only splits on the first tab.