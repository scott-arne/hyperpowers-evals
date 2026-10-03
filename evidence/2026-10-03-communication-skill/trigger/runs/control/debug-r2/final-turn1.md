I couldn't reproduce a failing test. Both tests pass on every interpreter I tried: the micromamba `main` env, plain `pytest`, and Homebrew `python3` (`2 passed`). The pytest cache has no record of a previous failure either.

I did find a real bug, and it's probably the one you're thinking of. The test that should catch it passes by coincidence.

**Root cause:** `list_notes()` in `notes.py` sorts by the note text, not the date:

```python
rows = sorted(load(), key=lambda r: r[1])   # r[1] is the text; r[0] is the date
```

`test_list_is_in_date_order` uses the notes `zebra`/`apple`/`mango`, and their alphabetical order happens to match their date order. So the test passes even though the sort is wrong. To confirm, I ran a quick check in `/tmp` with a note dated 2026-03-02 called "apple" and one dated 2026-01-15 called "zebra". `list_notes()` printed the March note first, which is wrong.

**Proposed fix (not applied):**
- In `notes.py`, sort on `r[0]` (ISO dates sort correctly as strings).
- Change the test data so alphabetical order and date order disagree. Then the test fails with the current code and passes with the fix.

**If you're seeing an actual failure:** it must come from a different command, environment, or uncommitted checkout than this one. The working tree here is clean at `fc399f1`. Send me the command and its output and I'll look at that instead.

I haven't changed anything in the repo.