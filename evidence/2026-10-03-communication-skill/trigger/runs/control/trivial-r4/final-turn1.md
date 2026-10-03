`python notes.py add <text>` adds one line to `notes.txt` (`notes.py:9`). The line holds today's date in ISO format, a tab, and the note text.

- **Multiple words:** all arguments after `add` are joined with single spaces (`notes.py:34`). So `add buy milk` and `add "buy milk"` save the same note. Extra spaces inside quotes are kept as typed, but unquoted extra spaces are lost to the shell.
- **Location:** `notes.txt` is a relative path, so the file is created or appended to in whatever directory you run the command from, not next to the script.
- **No output:** it prints nothing and returns exit code 0.

Some edge cases, based on reading the code (I didn't run it):

- `add` with no text still writes a line containing just the date and a tab.
- Nothing checks the text for newlines. A note with a newline in it (e.g. `add "$(printf 'a\nb')"`) becomes two lines in the file. `list` then shows the second line as its own note with an empty date.
- A tab inside the note is fine. `load()` splits each line only at the first tab.