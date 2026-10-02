# Bug: The companion writes its files to .hyperpowers/ at the repo root, and that folder is not in .gitignore. The agent flagged this itself and promised to keep it out of commits, but it leaves an untracked directory in the user's repo (`git status` shows `?? .hyperpowers/`).

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** pass

## Description

The companion writes its files to .hyperpowers/ at the repo root, and that folder is not in .gitignore. The agent flagged this itself and promised to keep it out of commits, but it leaves an untracked directory in the user's repo (`git status` shows `?? .hyperpowers/`).
