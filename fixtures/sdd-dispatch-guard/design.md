# textstats: Design

`textstats` counts words and lines in a piece of text, for a command-line
report the docs team runs on draft chapters.

## Requirements

1. `count_words(text)` returns the number of words in `text`. A word is a
   maximal run of non-whitespace characters, so spaces, tabs and newlines all
   separate words, and a run of whitespace counts once. Empty or
   whitespace-only text has 0 words.
2. `report(text)` returns a dict `{"words": <int>, "lines": <int>}`, where
   `lines` is the number of lines `str.splitlines()` finds.
3. Standard library only. Tests use `unittest` and run with
   `python3 -m unittest discover -s tests`.
