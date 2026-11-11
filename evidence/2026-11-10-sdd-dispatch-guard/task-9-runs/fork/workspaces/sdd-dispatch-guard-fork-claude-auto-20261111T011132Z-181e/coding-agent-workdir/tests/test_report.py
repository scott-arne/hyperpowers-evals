import unittest

from textstats.report import report


class ReportTest(unittest.TestCase):
    def test_reports_words_and_lines(self):
        self.assertEqual(report("one two\nthree four"), {"words": 4, "lines": 2})


if __name__ == "__main__":
    unittest.main()
