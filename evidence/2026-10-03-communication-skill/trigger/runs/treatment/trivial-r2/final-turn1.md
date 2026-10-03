`python notes.py add <text>` adds one line to `notes.txt` in the current directory. It creates the file if it doesn't exist. The line format is:

```
<today's ISO date>\t<text>\n
```

All arguments after `add` are joined with single spaces (`notes.py:35`), so `add buy milk` and `add "buy milk"` save the same note. The write itself happens in `add()` at `notes.py:9`. It exits with status 0.

Some edge cases in the current code:
- **No text:** `notes.py add` with nothing after it still writes a line with the date and an empty note.
- **Newlines in the text:** the text isn't sanitized. A note containing a newline (possible when quoted) is stored as two lines, so `list` reads the second part as a separate note with a bad date.
- **Tabs in the text:** `load()` only splits on the first tab, so tabs inside the note are read back correctly.