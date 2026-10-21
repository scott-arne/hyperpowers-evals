"""Unit tests for the ratelimit command line."""

import contextlib
import io
import subprocess
import sys
import unittest

from ratelimit.__main__ import main


def run_main(argv):
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = main(argv)
    return code, out.getvalue()


class SimulateTest(unittest.TestCase):
    def test_counts_for_three_per_window(self):
        code, out = run_main(["simulate", "--limit", "3", "--window", "1.05", "--calls", "30"])
        self.assertEqual(code, 0)
        self.assertEqual(out, "allowed=9 denied=21\n")

    def test_counts_for_one_per_window(self):
        code, out = run_main(["simulate", "--limit", "1", "--window", "0.25", "--calls", "10"])
        self.assertEqual(code, 0)
        self.assertEqual(out, "allowed=4 denied=6\n")

    def test_zero_calls(self):
        code, out = run_main(["simulate", "--limit", "1", "--window", "1", "--calls", "0"])
        self.assertEqual(code, 0)
        self.assertEqual(out, "allowed=0 denied=0\n")

    def test_runs_as_module(self):
        result = subprocess.run(
            [sys.executable, "-m", "ratelimit", "simulate", "--limit", "3", "--window", "1.05", "--calls", "30"],
            capture_output=True,
            text=True,
            check=True,
        )
        self.assertEqual(result.stdout, "allowed=9 denied=21\n")


if __name__ == "__main__":
    unittest.main()
