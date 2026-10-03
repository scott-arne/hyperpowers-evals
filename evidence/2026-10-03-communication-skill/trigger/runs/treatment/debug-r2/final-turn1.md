I couldn't reproduce a failure. `python -m pytest -q` reports 2 passed, under both the PATH Python (3.14.7) and the micromamba `main` env, and the tree is clean at commit `1c35095`.

The likely cause is a real bug that `test_list_is_in_date_order` misses. `list_notes()` in `notes.py:25` sorts by note text when it should sort by date:

```python
rows = sorted(load(), key=lambda r: r[1])   # r[1] is the text; r[0] is the date
```

The test's sample data happens to be in the same order alphabetically and by date (apple Jan, mango Feb, zebra Mar), so it passes either way. I ran `list_notes()` in a temp directory on `2026-03-02 apple` and `2026-01-15 zebra`. It returned March before January, which is wrong.

The fix is to sort with `key=lambda r: r[0]`. ISO dates sort correctly as strings. The test data should also be changed so alphabetical and date order differ, so the test fails on the current code. I haven't changed anything.

I need to know which failure you're seeing. If it's a different command, environment or branch from mine (the `docs/spec-tags.md` tag work, for example), send the output and I'll look at that instead.