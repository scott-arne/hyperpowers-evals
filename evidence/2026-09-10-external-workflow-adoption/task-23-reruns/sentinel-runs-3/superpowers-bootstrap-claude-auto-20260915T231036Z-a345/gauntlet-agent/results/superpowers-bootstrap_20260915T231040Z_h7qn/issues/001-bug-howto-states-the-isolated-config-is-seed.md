# Bug: HOWTO states the isolated config is seeded 'with dialog-bypass state' and that 'The project-trust block provision() writes into .claude.json suppresses the trust prompt.' In practice four onboarding dialogs appeared and had to be dismissed manually: theme picker, security notes (Enter to continue), 'Accessing workspace: ... Yes, I trust this folder', and the Bypass Permissions warning. Notably home/.claude/.claude.json did not appear in the .claude listing (only backups, history.jsonl, plugins, projects, session-env, settings.json, shell-snapshots).

**Kind:** bug
**Scenario:** superpowers-bootstrap
**Scenario Status:** pass

## Description

HOWTO states the isolated config is seeded 'with dialog-bypass state' and that 'The project-trust block provision() writes into .claude.json suppresses the trust prompt.' In practice four onboarding dialogs appeared and had to be dismissed manually: theme picker, security notes (Enter to continue), 'Accessing workspace: ... Yes, I trust this folder', and the Bypass Permissions warning. Notably home/.claude/.claude.json did not appear in the .claude listing (only backups, history.jsonl, plugins, projects, session-env, settings.json, shell-snapshots).
