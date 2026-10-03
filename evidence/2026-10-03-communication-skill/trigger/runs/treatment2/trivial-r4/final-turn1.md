`python notes.py add <text>` adds one line to the end of `notes.txt`. The line holds today's date, a tab, then the note text (`notes.py:9-11`):

```
2026-10-03	buy milk
```

Some details:

- **Arguments are joined with spaces.** `notes.py add buy milk` and `notes.py add "buy milk"` save the same note.
- **The file is relative to where you run the command.** `notes.txt` is created or appended in whatever directory you're in, not next to the script.
- **There's no validation:**
  - `notes.py add` with no text still saves a dated line with an empty note.
  - If the text contains a newline, the note gets split across lines. When `list` reads the file back, it treats each line as a separate note, so the format breaks.
- **It prints nothing and exits 0.**