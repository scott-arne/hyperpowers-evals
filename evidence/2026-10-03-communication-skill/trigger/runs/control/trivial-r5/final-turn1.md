`python notes.py add <text>` appends one line to `notes.txt` (`notes.py:9`).

- **What it writes:** today's date in ISO format, a tab, then your text, e.g. `2026-10-03\tbuy milk`.
- **How it handles words:** everything after `add` is joined with single spaces, so `add buy milk` and `add "buy milk"` save the same note.
- **Where the file goes:** `notes.txt` is a relative path, so it's created in whatever directory you run the command from, not next to the script. The file is opened in append mode, so earlier notes are never overwritten.
- **Output:** none on success. It exits with code 0.

Some edge cases it doesn't guard against:
- `add` with no text still saves a note with a date and an empty body.
- A newline in the text splits the note across lines, so `list` reads it back as two notes, and the second one has a broken date field.
- A tab in the text is safe. `load` splits only on the first tab, so later tabs stay in the note body.