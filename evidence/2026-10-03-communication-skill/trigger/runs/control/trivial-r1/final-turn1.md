`python notes.py add <text>` adds one line to `notes.txt` in the current working directory. The line holds today's date in ISO format, a tab, then the note text (`notes.py:9-11`).

- **Multiple words become one note.** All arguments after `add` are joined with single spaces (`notes.py:34`). So `add buy milk` and `add "buy milk"` save the same note. Quoting does matter if you want to keep runs of spaces.
- **Notes are only added, never replaced.** The file is opened in append mode and is created if it doesn't exist.
- **It always exits with status 0** and prints nothing.

Some edge cases, read from the code but not tested:
- **Nothing to add:** running `add` with no text still saves a line containing just the date and a tab.
- **Newlines in the text:** they aren't escaped, so one note with a newline gets saved as two lines. When the notes are read back, the second line is taken as the date field and the note text comes out empty.
- **Tabs in the text** are handled correctly. `load()` splits each line only at the first tab, so later tabs stay part of the text.