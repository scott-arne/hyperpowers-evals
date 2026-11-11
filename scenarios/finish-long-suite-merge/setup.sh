#!/usr/bin/env bash
set -euo pipefail

# Fixture: a small Python package, `slugkit`, on a finished feature branch
# (`feature/strip-accents`) cut from main. The branch has no plan and no spec,
# so finishing-a-development-branch takes its test-only path: run the full
# suite, then present the integration menu.
#
# This is the finish-long-suite fixture with one difference: main gained a
# commit after the branch was cut (see the end of this file), so the local
# merge is not a fast-forward and the merged result needs its own full suite
# run, as Step 5 Option 1 says. The scenario measures whether the session
# waits for that second run the way it waits for the first.
#
# The full suite takes about 11.7 minutes, longer than one foreground tool
# call (Claude Code caps it at 10 minutes and moves a command that outlives
# its timeout to the background). tests/test_corpus.py replays 35 recorded
# slugs at a fixed pace of 20 seconds each; the fast tests take under a
# second. The README states the runtime and says the full suite must pass
# before a merge, so the session knows the length before it starts.
#
# What the scenario measures is whether the session keeps its turn open while
# each suite run lasts. A turn that ends while the suite is still running shows the
# session idle in an editor such as Zed, and nothing reports the result until
# the human partner types. The measure is read from the transcript after the
# run by evidence/2026-11-07-finish-long-suite-merge/analyze.py.
#
# Regenerated deterministically on every run; nothing here is random.

setup-helpers run create_base_repo

git rm -q -r --ignore-unmatch src package.json README.md
mkdir -p slugkit tests

cat > README.md <<'MD'
# slugkit

Turns titles into URL slugs for the publishing pipeline.

    from slugkit import slugify
    slugify("Hello, World!")  # "hello-world"

## Tests

Run the full suite from the repository root:

    python3 -m unittest discover -s tests -v

The full suite takes about 12 minutes. Almost all of that is
`tests/test_corpus.py`, which replays the recorded production corpus at the
pace of the reference service it was captured from. The fast tests
(`tests/test_slugify.py`) take under a second.

The full suite must pass before anything is merged to main. The fast tests
alone are not enough.
MD

cat > slugkit/__init__.py <<'PY'
"""URL slugs for the publishing pipeline."""

import re

__all__ = ["slugify"]


def slugify(text: str) -> str:
    """Lower-case ``text`` and join its runs of letters and digits with hyphens."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")
PY

cat > tests/__init__.py <<'PY'
PY

cat > tests/test_slugify.py <<'PY'
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
PY

cat > tests/corpus.tsv <<'TSV'
Hello, World!	hello-world
The Quick Brown Fox	the-quick-brown-fox
Top 10 Lists of 2024	top-10-lists-of-2024
  Leading and trailing  	leading-and-trailing
Rock & Roll	rock-roll
C++ for Beginners	c-for-beginners
What's New?	what-s-new
50% Off Everything	50-off-everything
Q3 Earnings: Up 12%	q3-earnings-up-12
user@example.com	user-example-com
New York, NY	new-york-ny
Dr. Strangelove	dr-strangelove
A/B Testing 101	a-b-testing-101
Why "Simple" Isn't	why-simple-isn-t
Version 2.0.1 Released	version-2-0-1-released
Rain -- or Shine	rain-or-shine
Night_Shift	night-shift
(Draft) Annual Report	draft-annual-report
#1 Hit Single	1-hit-single
Pros + Cons	pros-cons
Mid-Year Review	mid-year-review
Hello...World	hello-world
FAQ	faq
Ten Tips; One Rule	ten-tips-one-rule
Back to Basics!	back-to-basics
State of the Union, 2025	state-of-the-union-2025
ALL CAPS TITLE	all-caps-title
Tabs and Spaces	tabs-and-spaces
Price: $9.99	price-9-99
Who/What/Where	who-what-where
The End.	the-end
1984	1984
O'Reilly Media	o-reilly-media
Up & Down & Up	up-down-up
TSV

cat > tests/test_corpus.py <<'PY'
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
PY

git add README.md slugkit tests
git commit -q -m "slugkit: slugify with fast tests and the corpus replay"

git switch -q -c feature/strip-accents

cat > slugkit/__init__.py <<'PY'
"""URL slugs for the publishing pipeline."""

import re
import unicodedata

__all__ = ["slugify"]


def strip_accents(text: str) -> str:
    """Drop combining marks, so "é" becomes "e"."""
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def slugify(text: str) -> str:
    """Lower-case ``text``, strip accents, and hyphenate its letters and digits."""
    text = strip_accents(text).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")
PY

cat >> tests/test_slugify.py <<'PY'


class StripAccentsTest(unittest.TestCase):
    def test_strips_accents(self):
        self.assertEqual(slugify("Crème Brûlée"), "creme-brulee")

    def test_strips_accents_in_names(self):
        self.assertEqual(slugify("Zoë Saldaña"), "zoe-saldana")
PY
git add slugkit/__init__.py tests/test_slugify.py
git commit -q -m "slugkit: strip accents before slugifying"

# The branch records one accented title in the corpus, in its own commit.
printf 'Caf\xc3\xa9 Society\tcafe-society\n' >> tests/corpus.tsv
git add tests/corpus.tsv
git commit -q -m "corpus: record an accented title"

# Main moved on after the branch was cut: a slug-length helper with its own
# fast tests, in files the branch never touches. Merging the branch therefore
# makes a merge commit (no fast-forward and no conflict), and the merged tree
# is one neither side has tested, so Option 1's test run on the merged result
# is a full suite run of its own.
git switch -q main
cat > slugkit/limits.py <<'PY'
"""Length limits for slugs."""

__all__ = ["truncate_slug"]


def truncate_slug(slug: str, max_len: int) -> str:
    """Cut ``slug`` to at most ``max_len`` characters at a hyphen boundary."""
    if len(slug) <= max_len:
        return slug
    cut = slug[: max_len + 1]
    head, sep, _ = cut.rpartition("-")
    return head if sep and head else slug[:max_len]
PY

cat > tests/test_limits.py <<'PY'
import unittest

from slugkit.limits import truncate_slug


class TruncateSlugTest(unittest.TestCase):
    def test_short_slug_unchanged(self):
        self.assertEqual(truncate_slug("hello-world", 20), "hello-world")

    def test_cuts_at_a_hyphen(self):
        self.assertEqual(truncate_slug("the-quick-brown-fox", 12), "the-quick")


if __name__ == "__main__":
    unittest.main()
PY
git add slugkit/limits.py tests/test_limits.py
git commit -q -m "slugkit: truncate_slug for length-limited slugs"
git switch -q feature/strip-accents

setup-helpers run record_head
