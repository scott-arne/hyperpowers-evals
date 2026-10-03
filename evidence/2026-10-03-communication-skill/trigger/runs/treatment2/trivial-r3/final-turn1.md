`python notes.py add <text>` adds one line to `notes.txt` with today's date and your text. The code is at `notes.py:9` and `notes.py:33`.

- **Text:** every argument after `add` is joined with single spaces, so `add buy milk` and `add "buy milk"` save the same note.
- **Line format:** `<YYYY-MM-DD>\t<text>\n`, for example `2026-10-03\tbuy milk`.
- **File:** it opens `notes.txt` in append mode, which creates the file if it doesn't exist. The path is relative, so the file lands in whatever directory you run the command from, not next to the script.
- **Result:** it returns exit code 0 and prints nothing.

A few things it doesn't check:
- **No text:** `notes.py add` with nothing after it still saves a line with only the date and an empty note.
- **Newlines:** a newline inside the text splits one note across two lines. The second line has no date, so `load()` reads its text as the date and gives it an empty note.
- **Tabs:** a tab inside the text is safe, because `load()` splits only on the first tab.