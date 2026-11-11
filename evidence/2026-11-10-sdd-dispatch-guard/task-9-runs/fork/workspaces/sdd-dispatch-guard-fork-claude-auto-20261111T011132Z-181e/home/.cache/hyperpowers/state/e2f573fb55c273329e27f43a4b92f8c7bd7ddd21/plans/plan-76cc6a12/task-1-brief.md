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

