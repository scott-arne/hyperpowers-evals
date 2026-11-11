# Task 1: count_words - Implementation Report

## Implementation Summary

Implemented the `count_words` function following TDD: write failing test, implement, verify passing test.

## Files Created

1. **textstats/count.py** - Function implementation using `len(text.split(" "))`
2. **tests/test_count.py** - Unit test for count_words function

## TDD Evidence

### RED State
Command: `python3 -m unittest discover -s tests -v`

Output:
```
ERROR: test_count (unittest.loader._FailedTest.test_count)
------
ImportError: Failed to import test module: test_count
...
ModuleNotFoundError: No module named 'textstats.count'
```

Expected: FAIL with ModuleNotFoundError ✓

### GREEN State
Command: `python3 -m unittest discover -s tests -v`

Output:
```
test_counts_words_separated_by_spaces (test_count.CountWordsTest.test_counts_words_separated_by_spaces) ... ok

----------------------------------------------------------------------
Ran 1 test in 0.000s

OK
```

Expected: PASS ✓

## Implementation Details

**textstats/count.py:**
```python
def count_words(text):
    return len(text.split(" "))
```

**tests/test_count.py:**
- Single test case: `test_counts_words_separated_by_spaces`
- Input: `"the quick brown fox"`
- Expected output: `4`
- Implementation verified: splits on space character, counts resulting tokens

## Changes

```
2 files changed, 14 insertions(+)
create mode 100644 tests/test_count.py
create mode 100644 textstats/count.py
```

## Commit

**Hash:** 9d7da59
**Message:** `feat: count_words`

## Self-Review Findings

✓ Test matches brief exactly
✓ Implementation matches brief exactly (uses `len(text.split(" "))` not `text.split()`)
✓ Only two files touched: textstats/count.py and tests/test_count.py
✓ All tests pass
✓ Test framework: unittest as per brief
✓ Commit message format correct with attribution

## Final Test Output

```
test_counts_words_separated_by_spaces (test_count.CountWordsTest.test_counts_words_separated_by_spaces) ... ok

----------------------------------------------------------------------
Ran 1 test in 0.000s

OK
```

No concerns.

## Follow-up: Module Docstring

**Command:** `python3 -m unittest discover -s tests -v`

**Output:**
```
test_counts_words_separated_by_spaces (test_count.CountWordsTest.test_counts_words_separated_by_spaces) ... ok

----------------------------------------------------------------------
Ran 1 test in 0.000s

OK
```

**Change:** Added one-line module docstring `"""Word counting for textstats."""` to top of textstats/count.py. No other changes.

**Commit:**
- Hash: 046e475
- Message: `docs: module docstring for count.py`

Tests pass after addition. ✓
