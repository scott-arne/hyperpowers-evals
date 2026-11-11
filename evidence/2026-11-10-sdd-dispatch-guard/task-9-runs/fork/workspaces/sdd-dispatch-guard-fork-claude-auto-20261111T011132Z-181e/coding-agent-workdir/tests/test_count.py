import unittest

from textstats.count import count_words


class CountWordsTest(unittest.TestCase):
    def test_counts_words_separated_by_spaces(self):
        self.assertEqual(count_words("the quick brown fox"), 4)


if __name__ == "__main__":
    unittest.main()
