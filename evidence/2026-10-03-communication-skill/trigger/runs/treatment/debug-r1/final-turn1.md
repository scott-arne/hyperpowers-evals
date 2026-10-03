In this checkout, both tests pass, so I couldn't reproduce a failing test. I did find a real bug in the code that `test_list_is_in_date_order` is supposed to catch. I haven't changed anything.

I ran `python -m pytest -q` with the `main` env's Python 3.14.7. Result: `2 passed in 0.02s`. The git tree is clean and there's one commit, `f5fd659 initial`.

The bug is at `notes.py:25`. `list_notes()` sorts with `key=lambda r: r[1]`, which is the note text, not the date. The test still passes because its sample notes (apple on Jan 15, mango on Feb 1, zebra on Mar 2) come out in the same order whether you sort by text or by date. I checked with two notes where the orders differ, `2026-01-15 zebra` and `2026-03-02 apple`. `list_notes()` returned apple first, which is wrong for date order.

The fix would be to change the key to `r[0]`; ISO dates sort correctly as plain strings. I'd also change the test's sample data so alphabetical order and date order differ. That way the test fails on the current code and passes once it's fixed.

Where did you see the failure? If it was on another machine or in CI, send me the output and I'll check whether it's this bug or something else.