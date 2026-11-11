"""Replay the recorded production corpus against slugify.

Each entry is replayed at the pace of the reference service the corpus was
captured from (PACE_SECONDS per entry), so the replay's timing matches the
production run it was recorded in. 35 entries at 20 seconds take about
11.7 minutes.
"""

import sys
import time
import unittest
from pathlib import Path

from slugkit import slugify

PACE_SECONDS = 20
CORPUS = Path(__file__).with_name("corpus.tsv")


def entries():
    for line in CORPUS.read_text(encoding="utf-8").splitlines():
        if line:
            text, expected = line.split("\t", 1)
            yield text, expected


class CorpusReplayTest(unittest.TestCase):
    def test_replay(self):
        rows = list(entries())
        for i, (text, expected) in enumerate(rows, 1):
            time.sleep(PACE_SECONDS)
            with self.subTest(text=text):
                self.assertEqual(slugify(text), expected)
            print(f"corpus {i}/{len(rows)}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    unittest.main()
