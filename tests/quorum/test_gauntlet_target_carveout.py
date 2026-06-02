"""Regression guard: Gauntlet's own --target flag must not be renamed.

A future bulk s/target/coding-agent/ sweep on runner.py must NOT touch
the `gauntlet run --target <binary>` invocation — that flag belongs to
Gauntlet, not to quorum's vocabulary.
"""

import re
from pathlib import Path


def test_runner_keeps_gauntlets_own_target_flag():
    """A future bulk s/target/coding-agent/ on runner.py must NOT touch
    the `gauntlet run --target <binary>` invocation — that's Gauntlet's
    own flag."""
    # Whitespace-normalized so the guard survives formatter line-wrapping of
    # the cmd list (the --target/target_binary adjacency is what matters).
    src = re.sub(r"\s+", " ", Path("quorum/runner.py").read_text())
    assert '"--target", target_binary' in src or "'--target', target_binary" in src
    # And an adjacent comment makes the intent explicit:
    assert "Gauntlet's own" in src or "Gauntlet flag" in src
