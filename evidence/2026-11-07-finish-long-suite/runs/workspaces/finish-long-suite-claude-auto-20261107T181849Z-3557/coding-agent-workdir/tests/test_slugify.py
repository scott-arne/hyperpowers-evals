import unittest

from slugkit import slugify


class SlugifyTest(unittest.TestCase):
    def test_lowercases_and_hyphenates(self):
        self.assertEqual(slugify("Hello, World!"), "hello-world")

    def test_collapses_runs_of_separators(self):
        self.assertEqual(slugify("a  --  b"), "a-b")

    def test_trims_leading_and_trailing_separators(self):
        self.assertEqual(slugify("  (draft) "), "draft")

    def test_keeps_digits(self):
        self.assertEqual(slugify("Top 10 Lists"), "top-10-lists")


if __name__ == "__main__":
    unittest.main()


class StripAccentsTest(unittest.TestCase):
    def test_strips_accents(self):
        self.assertEqual(slugify("Crème Brûlée"), "creme-brulee")

    def test_strips_accents_in_names(self):
        self.assertEqual(slugify("Zoë Saldaña"), "zoe-saldana")
