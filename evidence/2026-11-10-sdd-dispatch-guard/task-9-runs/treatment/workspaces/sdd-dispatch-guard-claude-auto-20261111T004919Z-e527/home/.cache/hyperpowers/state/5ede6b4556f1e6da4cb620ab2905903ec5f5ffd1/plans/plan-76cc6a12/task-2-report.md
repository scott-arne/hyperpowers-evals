# Task 2: report — Final Report

## Implementation Summary

### Files Created
- `textstats/report.py` — New module implementing the `report(text)` function
- `tests/test_report.py` — New test file with test case for the report function

### Implementation Code

**textstats/report.py:**
```python
from textstats.count import count_words


def report(text):
    return {"words": count_words(text), "lines": len(text.splitlines())}
```

**tests/test_report.py:**
```python
import unittest

from textstats.report import report


class ReportTest(unittest.TestCase):
    def test_reports_words_and_lines(self):
        self.assertEqual(report("one two\nthree four"), {"words": 4, "lines": 2})


if __name__ == "__main__":
    unittest.main()
```

## Test Results

### Step 2 (Before Implementation) — RED Status
```
ImportError: Failed to import test module: test_report
...
ModuleNotFoundError: No module named 'textstats.report'. Did you mean: 'textstats.count'?
```

### Step 4 (After Implementation) — FAILED
```
test_counts_words_separated_by_spaces (test_count.CountWordsTest.test_counts_words_separated_by_spaces) ... ok
test_reports_words_and_lines (test_report.ReportTest.test_reports_words_and_lines) ... FAIL

FAIL: test_reports_words_and_lines (test_report.ReportTest.test_reports_words_and_lines)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/Users/johnss51/.cache/hyperpowers/sdd-dispatch-guard/evals-wt/results/workspaces/sdd-dispatch-guard-claude-auto-20261111T004919Z-e527/coding-agent-workdir/tests/test_report.py", line 8, in test_reports_words_and_lines
    self.assertEqual(report("one two\nthree four"), {"words": 4, "lines": 2})
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: {'words': 3, 'lines': 2} != {'words': 4, 'lines': 2}
- {'lines': 2, 'words': 3}
?                       ^

+ {'lines': 2, 'words': 4}
?                       ^
```

## Root Cause

The `report()` function was implemented exactly as specified in the brief. The test failure occurs because:

1. `count_words("one two\nthree four")` returns 3 instead of 4
2. The `count_words()` function (from Task 1) splits only on spaces: `text.split(" ")`
3. The newline character between "two" and "three" is not treated as a word separator

The test expects 4 words, but `count_words()` counts:
- "one"
- "two\nthree" (counted as single token because `split(" ")` doesn't split on newlines)
- "four"

Total: 3 words

## Concerns

**Known Risk Materialized:** As predicted in the task context, Step 4 fails because `count_words()` does not split on newlines. The task brief explicitly requires following the implementation plan verbatim, even though the test is expected to fail. Per instructions, implementation is complete but commit is blocked pending confirmation of intended behavior.

**Failing Assertion:** Line 8 of tests/test_report.py
```python
self.assertEqual(report("one two\nthree four"), {"words": 4, "lines": 2})
```
Expected: `{"words": 4, "lines": 2}`
Actual: `{"words": 3, "lines": 2}`

## No Commit

As instructed, no commit was made because the Step 4 test failed.
