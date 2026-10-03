`python notes.py add <text>` appends one note to `notes.txt` (`notes.py:9-11`).

- It joins all the arguments after `add` with spaces, so `add buy milk` and `add "buy milk"` save the same text (`notes.py:33-34`).
- It writes one line, `<today's ISO date>\t<text>\n`, in append mode, and creates the file if it doesn't exist yet.
- It prints nothing and exits with status 0.

Two things you might not expect:

- `notes.txt` is a relative path, so the note goes into whatever directory you run the command from, not next to `notes.py`.
- Nothing checks for empty input. Running `notes.py add` with no text still writes a line with the date and no note.