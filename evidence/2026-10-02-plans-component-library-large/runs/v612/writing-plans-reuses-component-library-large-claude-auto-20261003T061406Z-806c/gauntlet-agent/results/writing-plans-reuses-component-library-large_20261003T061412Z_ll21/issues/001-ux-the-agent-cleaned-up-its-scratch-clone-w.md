# Ux: The agent cleaned up its scratch clone with `rm -rf "$(dirname $(ls -dt ${TMPDIR}tmp.*/h | head -1))"`. Even with bypass permissions on, Claude Code flagged this as "Dangerous rm operation on statically-unresolvable target" and showed a prompt that auto-denies after 60 seconds. If the user isn't watching, this blocks the session. Deleting a path built from `ls -dt ... | head -1` is also risky.

**Kind:** ux
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

The agent cleaned up its scratch clone with `rm -rf "$(dirname $(ls -dt ${TMPDIR}tmp.*/h | head -1))"`. Even with bypass permissions on, Claude Code flagged this as "Dangerous rm operation on statically-unresolvable target" and showed a prompt that auto-denies after 60 seconds. If the user isn't watching, this blocks the session. Deleting a path built from `ls -dt ... | head -1` is also risky.
