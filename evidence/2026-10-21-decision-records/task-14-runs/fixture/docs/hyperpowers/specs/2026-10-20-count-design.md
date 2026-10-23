# Count for notes-cli

**Date:** 2026-10-20
**Status:** approved

## Goal

Let the list command report how many notes there are.

## Decisions

1. **A `--count` flag on `list`, not a separate `count` subcommand.**
   `notes.sh list --count` prints the number of notes. A `count` subcommand was
   rejected because it would duplicate the file handling `list` already does.
2. **The CLI counts the lines of `notes.txt` itself, not through a library.**
   `list --count` runs `wc -l` on the notes file. A counting library was
   rejected because the tool is one short script and the library would be the
   larger part of it.
