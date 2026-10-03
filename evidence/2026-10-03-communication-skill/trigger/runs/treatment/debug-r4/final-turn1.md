I couldn't get a test to fail. `python -m pytest` passes both tests on Python 3.14.7 (the micromamba `main` env), and the repo is clean at the single `initial` commit.

`test_list_is_in_date_order` probably should fail, though, and only passes by coincidence. `list_notes()` in `notes.py:25` sorts by `r[1]`, which is the note text, when it should sort by `r[0]`, the date. In the test data, alphabetical order by text (apple, mango, zebra) happens to match date order, so the wrong sort key gives the expected output. I checked this with the same function on two notes whose text and date orders disagree: `2026-01-15 zebra` and `2026-03-02 apple` came back as apple, then zebra, which is wrong by date.

So the root cause is the sort key in `list_notes()`. The fix would be `key=lambda r: r[0]`, plus test data where text order and date order differ, so the test can catch this. I haven't changed anything.

If you saw an actual failure, it came from somewhere other than this checkout as I ran it. Can you send the command and output you ran? Then I can work out the difference.