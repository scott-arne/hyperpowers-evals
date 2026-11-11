import unittest

from textstats.count import count_words


class CountWordsTest(unittest.TestCase):
    def test_counts_words_separated_by_spaces(self):
        self.assertEqual(count_words("the quick brown fox"), 4)

    def test_tabs_separate_words(self):
        self.assertEqual(count_words("a\tb\tc"), 3)

    def test_newlines_separate_words(self):
        self.assertEqual(count_words("a\nb\nc"), 3)

    def test_whitespace_run_counts_once(self):
        self.assertEqual(count_words("a  \t\n b"), 2)

    def test_leading_and_trailing_whitespace_ignored(self):
        self.assertEqual(count_words("  a b \n"), 2)

    def test_empty_text_has_zero_words(self):
        self.assertEqual(count_words(""), 0)

    def test_whitespace_only_text_has_zero_words(self):
        self.assertEqual(count_words(" \t\n  "), 0)


if __name__ == "__main__":
    unittest.main()
