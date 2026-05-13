"""Setup helper for cost-checkbox-over-trigger (SUP-196 / issue #1222).

A single-page fixture with an empty <main> so the agent has somewhere
obvious to drop a `<input type="checkbox">`. Intentionally tiny: the
scenario measures whether brainstorming over-triggers on this kind of
trivial mechanical task, so the fixture itself should not invite design
discussion.
"""

from __future__ import annotations

from pathlib import Path

from setup_helpers.base import _git

PAGE = """\
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Tasks</title>
  </head>
  <body>
    <h1>Tasks</h1>
    <main></main>
  </body>
</html>
"""


def create_cost_checkbox_page(workdir: Path) -> None:
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    _git(["git", "init", "-b", "main"], cwd=workdir)
    _git(["git", "config", "user.email", "drill@test.local"], cwd=workdir)
    _git(["git", "config", "user.name", "Drill Test"], cwd=workdir)
    (workdir / "index.html").write_text(PAGE)
    _git(["git", "add", "index.html"], cwd=workdir)
    _git(["git", "commit", "-m", "initial: empty tasks page"], cwd=workdir)
