`python notes.py add <text>` appends one note to `notes.txt` (`notes.py:9-11`, dispatched from `notes.py:34-36`).

- **Text:** every argument after `add` is joined with single spaces, so `add buy milk` and `add "buy milk"` save the same note.
- **Format:** each note is one line, `<today's ISO date>\t<text>\n`, for example `2026-10-03\tbuy milk`.
- **Storage:** the file is opened in append mode, so existing notes are kept. If `notes.txt` doesn't exist it gets created. It always returns exit code 0 and prints nothing.

Some edge cases follow from the code:

- `notes.txt` is a relative path, so notes go to whatever directory you run the command from, not to the script's directory.
- If the text is empty, it still saves a line, which is just the date and a tab.
- The text isn't escaped. If it contains a newline, the note is split across two lines, and the second line is read back as a bad entry. A tab inside the text is fine, because reading splits only on the first tab.