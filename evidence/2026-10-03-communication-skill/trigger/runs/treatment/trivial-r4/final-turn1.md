`python notes.py add <text>` adds a line to `notes.txt` in the current working directory. It creates the file if it doesn't exist. Each line has the form `<today's ISO date>\t<text>`, for example `2026-10-03\tbuy milk` (`notes.py:9-11`).

- **Multiple arguments are joined with spaces.** `add buy milk` and `add "buy milk"` save the same note (`notes.py:33-34`).
- **It prints nothing** and exits with status 0.
- **Nothing is checked first.** A bare `add` saves an empty note.
- **Tabs and newlines in the text can break the file.** `load()` splits each line on the first tab, so a tab inside a note is fine. A newline is not: it splits the note into two lines, and the second line has no date, so `list` shows it wrong.