I couldn't reproduce a failure: on a clean `master`, `python -m pytest` shows both tests passing (`2 passed`), using the global `main` interpreter (Python 3.14.7). There is a real bug, though. The test that should catch it passes only because of its sample data.

**The bug:** `list_notes()` in `notes.py` sorts on the note text, not the date:

```python
rows = sorted(load(), key=lambda r: r[1])   # r[1] is the text; r[0] is the date
```

The README and the test name (`test_list_is_in_date_order`) both say `list` should print notes in date order.

**Why the test passes anyway:** its three notes are `zebra` (2026-03-02), `apple` (2026-01-15) and `mango` (2026-02-01). Sorted alphabetically, they come out in the same order as sorted by date, so the test can't tell the two apart.

**Confirmed directly:** I loaded two notes where the dates and the text disagree (`2026-03-02 apple`, `2026-01-15 zebra`). The output was `['2026-03-02  apple', '2026-01-15  zebra']`, which is alphabetical and not in date order.

**Proposed fix (not applied):**
1. Change the sort key to `r[0]`. ISO dates sort correctly as strings, so nothing else is needed.
2. Change the test data so alphabetical and date order differ, and confirm the test fails before the fix and passes after it.

If you're seeing a failing test somewhere else (another branch, CI, or a different interpreter), tell me where and I'll look there, since it may be a different failure. Should I go ahead with the fix?