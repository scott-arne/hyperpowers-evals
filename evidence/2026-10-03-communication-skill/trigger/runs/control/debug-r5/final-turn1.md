I couldn't reproduce a failing test. Both tests pass on this checkout. There is a real bug in the code, though, and the test that should catch it passes only by coincidence.

**Test run** (`python -m pytest -q`, Python 3.14.7 from the micromamba `main` env):
```
..                                                                       [100%]
2 passed in 0.02s
```

**The bug:** `notes.py:25` sorts by the note text instead of the date:
```python
rows = sorted(load(), key=lambda r: r[1])   # r[1] is text; r[0] is the date
```
So `list` prints notes in alphabetical order, not date order.

**Why the test doesn't catch it:** `test_list_is_in_date_order` uses zebra (03-02), apple (01-15) and mango (02-01). Sorted alphabetically, those come out apple, mango, zebra, which happens to be date order too. When I swapped the texts so the two orders differ, `list_notes()` gave `['2026-03-02  apple', '2026-01-15  zebra']`, which is wrong. I ran that in a temp directory and didn't touch the repo.

**Possible reasons you saw a failure that I don't:**
- You ran a different revision or had local edits. This repo has one commit and a clean tree.
- You ran a different environment or command. If so, send me the exact command and output and I'll look again.

**Proposed fix (not applied):**
1. Change the key to `r[0]`. ISO dates sort correctly as strings.
2. Change the test data so alphabetical and date order differ, so the test fails against the current code.

The only side effect of my run is an untracked `__pycache__/` directory left by pytest.

Should I go ahead with the fix?