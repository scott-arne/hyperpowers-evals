I couldn't reproduce a failing test: both tests pass here. One of them passes only by coincidence, though, and that is probably the failure you're seeing.

`list_notes()` sorts by the note text when it should sort by the date. `notes.py:25` uses `key=lambda r: r[1]`, and `r[1]` is the text (`r[0]` is the date). `test_list_is_in_date_order` happens to use fixture data where alphabetical order and date order are the same (apple/Jan, mango/Feb, zebra/Mar), so it passes. With any data where the two orders differ, it fails. I checked this directly: with `2026-03-02 apple` and `2026-01-15 zebra`, `list_notes()` puts the March note first.

How I ran it: `python3 -m pytest` with Python 3.14.7 from the micromamba `main` env, with and without the randomization and cache plugins. Both tests passed every time. The repo has one commit, no pytest config, no `notes.txt`, and no other test files.

The fix would be one character: change `r[1]` to `r[0]` on line 25. I'd also change the test fixture so that text order and date order disagree, so the test can catch this bug again. Neither change is made yet.

If the failure you saw is a different one (another machine, a branch I don't have, or tests for the tags feature in `docs/spec-tags.md`, which has no code or tests in this repo), send me the output and I'll look at that instead.