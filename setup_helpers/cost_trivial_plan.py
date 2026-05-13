"""Setup helper for cost-trivial-task-review-fanout (SUP-196 / #716, #1120).

Drops a plan with exactly one trivial task ("add a one-line console.log")
and a 5-line src/app.js for that line to land in. Lets the scenario
measure whether the agent dispatches a full implementer + spec-compliance
+ code-quality review fanout for a single-line change.
"""

from __future__ import annotations

from pathlib import Path

from setup_helpers.base import _git

APP_JS = """\
function main() {
  return 0;
}

main();
"""

PLAN = """\
# 2026-05-06 Trivial single-line change

A one-task plan used by the cost-trivial-task-review-fanout drill scenario.
The task is intentionally trivial; the cost question is whether the
executing-plans / SDD path fans out into multiple review subagents
disproportionate to the change.

## Task 1: Log app start

**File:** `src/app.js`

Add the line `console.log('app started');` as the very first line of
`src/app.js`, before the existing `function main()` declaration.

That's the entire change.
"""


def create_cost_trivial_plan(workdir: Path) -> None:
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    _git(["git", "init", "-b", "main"], cwd=workdir)
    _git(["git", "config", "user.email", "drill@test.local"], cwd=workdir)
    _git(["git", "config", "user.name", "Drill Test"], cwd=workdir)

    src_dir = workdir / "src"
    src_dir.mkdir()
    (src_dir / "app.js").write_text(APP_JS)

    plans_dir = workdir / "docs" / "superpowers" / "plans"
    plans_dir.mkdir(parents=True)
    (plans_dir / "2026-05-06-trivial.md").write_text(PLAN)

    _git(["git", "add", "-A"], cwd=workdir)
    _git(["git", "commit", "-m", "initial: app stub + trivial plan"], cwd=workdir)
