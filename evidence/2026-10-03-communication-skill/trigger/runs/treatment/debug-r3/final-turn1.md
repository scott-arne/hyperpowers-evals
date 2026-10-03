I couldn't reproduce the failure: both tests pass here (`2 passed`, run with `python3 -m pytest` on Python 3.14.7 from the micromamba `main` env). I didn't change anything.

I did find a real bug that the date-order test is supposed to catch but doesn't. It may be what you saw failing.

**Root cause:** `list_notes` sorts by the note text, not the date. In `notes.py:26`:

```python
rows = sorted(load(), key=lambda r: r[1])   # r[1] is the text; r[0] is the date
```

**Why the test still passes:** in `test_list_is_in_date_order`, alphabetical order (apple, mango, zebra) happens to match date order (Jan, Feb, Mar). Sorting by text gives the expected output by coincidence.

**Confirmation:** I ran `list_notes()` in a scratch directory on two notes where the two orders differ:

```
2026-03-02  apple
2026-01-15  zebra
```

It returned them in that same order, so `list` is not in date order.

**Proposed fix (not applied):**
- Change the key to `r[0]`. ISO dates sort correctly as strings.
- Change the test data so text order and date order disagree. Then the test fails on the current code and passes after the fix.

If you saw a failure somewhere else (another branch, uncommitted changes, CI, a different Python), send me the test output and I'll look at that too. Otherwise, let me know if you want me to make the fix above.