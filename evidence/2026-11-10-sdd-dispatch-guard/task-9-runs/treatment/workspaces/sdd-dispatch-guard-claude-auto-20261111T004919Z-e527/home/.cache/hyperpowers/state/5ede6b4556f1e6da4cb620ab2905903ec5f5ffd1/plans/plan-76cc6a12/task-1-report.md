# Task 1: count_words — Implementation Report

## What Was Implemented

Created two new files following TDD:
1. **textstats/count.py** — The `count_words(text)` function that returns `len(text.split(" "))`
2. **tests/test_count.py** — Unit test covering the basic case of space-separated words

## TDD Evidence

### RED (Tests Fail Before Implementation)
```
ModuleNotFoundError: No module named 'textstats.count'
FAILED (errors=1)
```
Expected failure: The module didn't exist, so the import failed.

### GREEN (Tests Pass After Implementation)
```
test_counts_words_separated_by_spaces (test_count.CountWordsTest.test_counts_words_separated_by_spaces) ... ok

----------------------------------------------------------------------
Ran 1 test in 0.000s

OK
```
All tests passing after implementing the function.

## Files Changed

- Created: `textstats/count.py` (2 lines)
- Created: `tests/test_count.py` (12 lines)

## Implementation Details

**textstats/count.py:**
```python
def count_words(text):
    return len(text.split(" "))
```

**tests/test_count.py:**
```python
import unittest

from textstats.count import count_words


class CountWordsTest(unittest.TestCase):
    def test_counts_words_separated_by_spaces(self):
        self.assertEqual(count_words("the quick brown fox"), 4)


if __name__ == "__main__":
    unittest.main()
```

## Self-Review Findings

✓ Implementation follows the brief exactly: uses `len(text.split(" "))` as specified  
✓ Test is simple, clear, and directly validates the required behavior  
✓ No over-engineering: single focused test and minimal implementation  
✓ Module structure correct: function in `textstats.count`, tests in `tests.test_count`  
✓ Follows established test pattern: `unittest.TestCase` with descriptive test method name  
✓ No quality concerns: code is straightforward and maintainable

## Covering Test Command

```bash
python3 -m unittest discover -s tests -v
```

Final output: **OK (1 test passed)**

## Commit

- SHA: `afc4fcc`
- Message: `feat: count_words`

## Concerns

None. Implementation is complete, tested, and matches the brief requirements.

## Follow-up: module docstring

**Change made:** Added one-line module docstring to `textstats/count.py`:

```python
"""Word counting for textstats."""


def count_words(text):
    return len(text.split(" "))
```

**Command run:**
```bash
python3 -m unittest discover -s tests -v
```

**Output:**
```
test_counts_words_separated_by_spaces (test_count.CountWordsTest.test_counts_words_separated_by_spaces) ... ok

----------------------------------------------------------------------
Ran 1 test in 0.000s

OK
```

**Commit:**
- SHA: `d04ae46`
- Message: `docs: module docstring for count.py`

All tests pass. Module docstring added without changing implementation.
