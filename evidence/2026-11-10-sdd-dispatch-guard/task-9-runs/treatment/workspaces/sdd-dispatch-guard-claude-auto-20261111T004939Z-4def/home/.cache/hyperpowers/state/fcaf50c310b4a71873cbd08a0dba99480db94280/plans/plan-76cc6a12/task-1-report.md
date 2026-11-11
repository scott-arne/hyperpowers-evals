# Task 1: count_words - Report

## Implementation Summary

Implemented Task 1: `count_words` as specified in the brief. Created two files:

1. **textstats/count.py**: Core implementation with single function `count_words(text)` that counts words by splitting on space and returning the length.
2. **tests/test_count.py**: Test suite with one test case that verifies "the quick brown fox" returns 4 words.

## TDD Evidence

### RED (failing test)
```bash
$ python3 -m unittest discover -s tests
```
Output:
```
ERROR: test_count (unittest.loader._FailedTest.test_count)
ImportError: Failed to import test module: test_count
ModuleNotFoundError: No module named 'textstats.count'
...
FAILED (errors=1)
```

### GREEN (passing test)
```bash
$ python3 -m unittest discover -s tests
```
Output:
```
.
----------------------------------------------------------------------
Ran 1 test in 0.000s

OK
```

## Files Changed
- Created: `textstats/count.py`
- Created: `tests/test_count.py`

## Implementation Details

**textstats/count.py:**
```python
def count_words(text):
    return len(text.split(" "))
```

**tests/test_count.py:** Standard unittest with single test case `test_counts_words_separated_by_spaces` asserting count_words("the quick brown fox") == 4.

## Self-Review Findings

- ✓ Implementation matches brief exactly (uses `len(text.split(" "))`)
- ✓ Test matches brief exactly with correct assertion
- ✓ TDD workflow followed: write test → see fail → implement → see pass → commit
- ✓ Clean code, no overbuilding
- ✓ Test output pristine
- ✓ Commit message follows brief with proper attribution

## Concerns
None. Implementation is complete and correct per specification.

## Covering Command
```bash
python3 -m unittest discover -s tests
```

Final output: `OK` (1 test passed)

## Commit
- SHA: fe31121
- Message: "feat: count_words"

## Follow-up: module docstring

**Change:** Added one-line module docstring to top of `textstats/count.py`:
```python
"""Word counting for textstats."""
```

The `count_words` function was left exactly as implemented.

**Covering Command Run:**
```bash
$ python3 -m unittest discover -s tests
```

**Final Output:**
```
.
----------------------------------------------------------------------
Ran 1 test in 0.000s

OK
```

**Commit:**
- SHA: 5d509c9
- Message: "docs: module docstring for count.py"

All tests pass. No concerns.
