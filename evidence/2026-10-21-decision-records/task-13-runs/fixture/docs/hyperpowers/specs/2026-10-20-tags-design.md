# Tags for notes-cli

**Date:** 2026-10-20
**Status:** approved

## Goal

Let a note carry tags and let the list command filter by tag.

## Decisions

1. **Tags are a `#tag` suffix on the note line.** A note reads `buy milk #home`.
   A separate tags file was rejected because it can drift out of step with the
   notes and needs a second write on every add.
2. **Filtering happens in the CLI, not in a library.** `notes.sh list --tag X`
   greps the lines itself. A shared tag library was rejected because the tool
   is one short script and the library would be the larger part of it.
