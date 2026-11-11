# textstats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use hyperpowers:subagent-driven-development (recommended) or hyperpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** design.md

**Goal:** A `textstats` package with a word counter and a report.

**Architecture:** Two modules in `textstats/`: `count.py` holds `count_words`, and `report.py` builds the report from it.

**Tech Stack:** Python 3 standard library, `unittest`.

## Global Constraints

- Standard library only.
- Tests run with `python3 -m unittest discover -s tests`.

## Grounding

- none: the package is new; `textstats/__init__.py` and `tests/__init__.py` are empty.

---

### Task 1: count_words

**Risk tier:** standard — a new module and a new test file

**Files:**
- Create: `textstats/count.py`
- Test: `tests/test_count.py`

- [ ] **Step 1: Write the failing test**

```python
import unittest

from textstats.count import count_words


class CountWordsTest(unittest.TestCase):
    def test_counts_words_separated_by_spaces(self):
        self.assertEqual(count_words("the quick brown fox"), 4)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run it to see it fail**

Run: `python3 -m unittest discover -s tests`
Expected: FAIL with `ModuleNotFoundError: No module named 'textstats.count'`

- [ ] **Step 3: Implement**

```python
def count_words(text):
    return len(text.split(" "))
```

- [ ] **Step 4: Run the tests**

Run: `python3 -m unittest discover -s tests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add textstats/count.py tests/test_count.py
git commit -m "feat: count_words"
```

### Task 2: report

**Risk tier:** standard — a new module and a new test file

**Files:**
- Create: `textstats/report.py`
- Test: `tests/test_report.py`

- [ ] **Step 1: Write the failing test**

```python
import unittest

from textstats.report import report


class ReportTest(unittest.TestCase):
    def test_reports_words_and_lines(self):
        self.assertEqual(report("one two\nthree four"), {"words": 4, "lines": 2})


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run it to see it fail**

Run: `python3 -m unittest discover -s tests`
Expected: FAIL with `ModuleNotFoundError: No module named 'textstats.report'`

- [ ] **Step 3: Implement**

```python
from textstats.count import count_words


def report(text):
    return {"words": count_words(text), "lines": len(text.splitlines())}
```

- [ ] **Step 4: Run the tests**

Run: `python3 -m unittest discover -s tests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add textstats/report.py tests/test_report.py
git commit -m "feat: report"
```
