`python notes.py add <text>` appends one line to `notes.txt` in the current working directory. The line is today's date in ISO format, a tab, then the note text (`notes.py:9-11`). It creates the file if it doesn't exist and returns exit code 0.

A few behaviors worth knowing:

- **Arguments are joined with spaces.** `add buy milk` and `add "buy milk"` store the same note (`notes.py:34`).
- **Empty notes are allowed.** A bare `add` with no text still writes a line containing only the date and a tab.
- **The text isn't escaped.** If a note contains a newline, it splits into two lines, and `list` will read the second part as a separate, malformed note. A tab inside the text is fine, because loading splits only on the first tab.
- **The date is all it records.** There's no time of day, and nothing prevents duplicate notes.