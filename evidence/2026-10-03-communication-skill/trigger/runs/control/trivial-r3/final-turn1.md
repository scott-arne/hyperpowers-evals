`add` appends a single note to `notes.txt` (`notes.py:9-11`).

```
python notes.py add buy milk
```

- All arguments after `add` are joined with spaces into one note, so `add buy milk` and `add "buy milk"` give the same result.
- The note is written as one line: today's date in ISO format, a tab, then the text. For example, `2026-10-03\tbuy milk`.
- The file is opened in append mode, so existing notes are kept. If the file doesn't exist yet, it is created.
- It prints nothing and returns exit code 0.

Some quirks you might run into:

- `notes.txt` is a relative path, so the note goes into whatever directory you run the command from, not next to the script.
- Nothing checks the input. `python notes.py add` with no text saves an empty note with only a date.
- If the text contains a newline, `list` will read it back as two separate notes. A tab inside the text is safe, because `load()` only splits on the first tab.