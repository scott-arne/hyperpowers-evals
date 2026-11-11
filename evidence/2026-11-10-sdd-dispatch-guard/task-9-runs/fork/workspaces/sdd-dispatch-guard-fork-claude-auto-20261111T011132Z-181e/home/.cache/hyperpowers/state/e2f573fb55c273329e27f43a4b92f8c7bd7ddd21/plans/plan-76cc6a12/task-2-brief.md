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
