import unittest

from slugkit.limits import truncate_slug


class TruncateSlugTest(unittest.TestCase):
    def test_short_slug_unchanged(self):
        self.assertEqual(truncate_slug("hello-world", 20), "hello-world")

    def test_cuts_at_a_hyphen(self):
        self.assertEqual(truncate_slug("the-quick-brown-fox", 12), "the-quick")


if __name__ == "__main__":
    unittest.main()
