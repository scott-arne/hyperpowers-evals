I couldn't reproduce a failing test. Both tests pass: `python -m pytest -v` on Python 3.14.7 (the global `main` env, since the repo has no venv) reports `2 passed`. I did find a real bug that the date-order test is supposed to catch, but its data happens to hide it.

**Root cause:** `list_notes()` sorts by the note text instead of the date. In `notes.py:25`:

```python
rows = sorted(load(), key=lambda r: r[1])   # r[1] is text; r[0] is the date
```

`test_list_is_in_date_order` still passes because its notes (`apple` 01-15, `mango` 02-01, `zebra` 03-02) are in the same order alphabetically as by date. When the two orders differ, the bug shows. I checked this in a scratch directory outside the repo:

```
2026-01-15 zebra, 2026-03-02 apple  ->  ['2026-03-02  apple', '2026-01-15  zebra']
```

That's alphabetical order, not date order.

**Proposed fix (not applied):**
1. Change the sort key to `r[0]`. ISO dates sort correctly as strings.
2. Change the test data so alphabetical and date order differ, so the test fails on the current code before the fix and passes after.

**Possible reasons it fails for you and not here:**
- You may be running a different checkout, branch or test file. The repo has one commit (`caf03b1 initial`) and a clean tree.
- The failure may depend on your environment. For example, `test_add_appends` writes into `tmp_path` via `chdir`, so it shouldn't touch your real `notes.txt`.

If you can paste the failing test name and its output, I'll check that it's the same issue.

Running pytest created untracked `.pytest_cache/` and `__pycache__/` directories, and the repo has no `.gitignore`. I haven't changed anything else. Should I go ahead with the fix?