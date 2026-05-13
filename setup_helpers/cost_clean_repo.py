"""Setup helper for cost-spec-plan-duplication (SUP-196 / issue #512).

A clean empty git repo with a deliberately vague README about a "small
CLI for tracking habits" - vague enough to invite the brainstorming +
plan duplication pattern that #512 reported. The scenario then measures
how much of the plan doc restates the spec doc.
"""

from __future__ import annotations

from pathlib import Path

from setup_helpers.base import _git

README = """\
# habits

A small CLI for tracking habits.

This is intentionally a sketch - there's no implementation yet.
"""


def create_cost_clean_repo(workdir: Path) -> None:
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    _git(["git", "init", "-b", "main"], cwd=workdir)
    _git(["git", "config", "user.email", "drill@test.local"], cwd=workdir)
    _git(["git", "config", "user.name", "Drill Test"], cwd=workdir)
    (workdir / "README.md").write_text(README)
    _git(["git", "add", "README.md"], cwd=workdir)
    _git(["git", "commit", "-m", "initial: README"], cwd=workdir)
