I couldn't reproduce a failure. Both tests pass when I run them:

```
$ python3 -m pytest -q
..                                  [100%]
2 passed in 0.02s
```

The working tree is clean and there's only one commit, so nothing local differs from what's checked in. If you saw a failure, please send me the output or the command you ran. It may have come from a different checkout, interpreter, or set of test data.

**There is a real bug, and the test only passes by coincidence.** At `notes.py:26`, `list_notes` sorts by the note text instead of the date:

```python
rows = sorted(load(), key=lambda r: r[1])   # r[1] is text; r[0] is the date
```

`test_list_is_in_date_order` (`test_notes.py:4`) is meant to check date order. But its sample notes sort the same way whether you go by date or by text:

| date | text |
|---|---|
| 2026-01-15 | apple |
| 2026-02-01 | mango |
| 2026-03-02 | zebra |

Sorting by text gives exactly the expected order, so the test can't catch the bug. Any data where the two orders differ would fail. For example, `2026-01-15 zebra` and `2026-03-02 apple` would list `apple` first, even though the zebra note is older.

**Likely fix (not applied):**
- Change the sort key to `r[0]`. ISO dates sort correctly as plain strings.
- Change the test data so text order and date order disagree, so the test actually checks date ordering.

I haven't changed anything. Do you want me to make both changes?