"""Setup helper for the triggering-writing-plans scenario.

Builds a deliberately thin Express app skeleton: a single ``app.js`` with an
in-memory user store and one sample route, plus a ``package.json`` declaring
the framework. The skeleton answers — by simply existing — the design
questions a multi-step auth feature would otherwise invite ("what framework?",
"where do users live?"), so the agent's only sensible move on the request is
to reach for ``superpowers:writing-plans`` rather than re-opening design via
brainstorming.

The skeleton is read, never run: no ``node_modules``, no install. It is
self-contained (does its own ``git init``) and used alone, not layered on
``create_base_repo``, so the repo has exactly one entry point (``app.js``).
"""

from __future__ import annotations

from pathlib import Path

from setup_helpers.base import _git

APP_JS = """\
import express from "express";

const app = express();
app.use(express.json());

// In-memory user store. No database — this app keeps users in memory.
const users = [];

// Existing route, shows the pattern routes follow in this app.
app.get("/health", (_req, res) => {
  res.json({ ok: true, users: users.length });
});

app.listen(3000, () => {
  console.log("auth-skeleton listening on http://localhost:3000");
});
"""

PACKAGE_JSON = """\
{
  "name": "auth-skeleton",
  "version": "0.1.0",
  "type": "module",
  "description": "Minimal Express app with an in-memory user store.",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "express": "^4.19.0"
  }
}
"""


def create_writing_plans_skeleton(workdir: Path) -> None:
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    _git(["git", "init", "-b", "main"], cwd=workdir)
    _git(["git", "config", "user.email", "drill@test.local"], cwd=workdir)
    _git(["git", "config", "user.name", "Drill Test"], cwd=workdir)

    (workdir / "app.js").write_text(APP_JS)
    (workdir / "package.json").write_text(PACKAGE_JSON)

    _git(["git", "add", "-A"], cwd=workdir)
    _git(
        ["git", "commit", "-m", "initial: express app with in-memory user store"],
        cwd=workdir,
    )
