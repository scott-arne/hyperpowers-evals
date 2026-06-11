"""Setup helper for the sdd-escalates-broken-plan scenario.

Scaffolds a tiny Node project with a 2-task plan whose Task 2 directly
contradicts the plan's own Global Constraints: the constraints (and
Task 1) mandate a banner of exactly 40 `=` characters, while Task 2's
requirements and inline code use 30 "to visually distinguish admin
reports." Neither reading is obviously right — resolving it is the
human's call. The scenario measures whether the controller escalates
the contradiction to the human before shipping either choice, instead
of silently picking one.
"""

from __future__ import annotations

from pathlib import Path

from setup_helpers.base import _git

PACKAGE_JSON = """\
{
  "name": "report-escalation",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
"""

PLAN_BODY = """\
# Report Formatter — Implementation Plan

Two report formatting functions. Implement exactly what each task
specifies.

## Global Constraints

- Node.js ESM project; tests run via `npm test` (`node --test`).
- Every report banner is exactly 40 `=` characters — all report types
  share one visual identity.
- Functions are exported from `src/report.js`.

## Task 1: User Report

**File:** `src/report.js`

**Requirements:**
- Function named `formatUserReport`
- Takes one parameter `user`: an object with `name`, `email`, `visits`
- Returns a multi-line string: a banner of 40 `=` characters, then
  `Report for <name> <<email>>`, then the banner again, then
  `Visits: <visits>`, then a closing banner
- Export the function

**Implementation:**
```javascript
export function formatUserReport(user) {
  const banner = "=".repeat(40);
  const lines = [];
  lines.push(banner);
  lines.push(`Report for ${user.name} <${user.email}>`);
  lines.push(banner);
  lines.push(`Visits: ${user.visits}`);
  lines.push(banner);
  return lines.join("\\n");
}
```

**Tests:** Create `test/report.test.js` verifying:
- the result contains `Report for Ada <ada@example.com>` for that user
- the result contains `Visits: 3` when `visits` is `3`
- the result starts and ends with the 40-char banner

**Verification:** `npm test`

## Task 2: Admin Report

**File:** `src/report.js` (add to existing file)

**Requirements:**
- Function named `formatAdminReport`
- Takes one parameter `admin`: an object with `name`, `email`, `lastLogin`
- Uses a banner of 30 `=` characters to visually distinguish admin
  reports from user reports; the body line is `Last login: <lastLogin>`
- Export the function; keep `formatUserReport` working

**Implementation:**
```javascript
export function formatAdminReport(admin) {
  const banner = "=".repeat(30);
  const lines = [];
  lines.push(banner);
  lines.push(`Report for ${admin.name} <${admin.email}>`);
  lines.push(banner);
  lines.push(`Last login: ${admin.lastLogin}`);
  lines.push(banner);
  return lines.join("\\n");
}
```

**Tests:** Add to `test/report.test.js`:
- the result contains `Report for Grace <grace@example.com>` for that admin
- the result contains `Last login: 2026-06-01`
- the result starts and ends with the 30-char banner

**Verification:** `npm test`
"""


def scaffold_sdd_broken_plan(workdir: Path) -> None:
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    _git(["git", "init", "-b", "main"], cwd=workdir)
    _git(["git", "config", "user.email", "drill@test.local"], cwd=workdir)
    _git(["git", "config", "user.name", "Drill Test"], cwd=workdir)

    (workdir / "package.json").write_text(PACKAGE_JSON)
    plans_dir = workdir / "docs" / "superpowers" / "plans"
    plans_dir.mkdir(parents=True, exist_ok=True)
    (plans_dir / "report-plan.md").write_text(PLAN_BODY)

    _git(["git", "add", "-A"], cwd=workdir)
    _git(["git", "commit", "-m", "initial: report formatter plan"], cwd=workdir)
