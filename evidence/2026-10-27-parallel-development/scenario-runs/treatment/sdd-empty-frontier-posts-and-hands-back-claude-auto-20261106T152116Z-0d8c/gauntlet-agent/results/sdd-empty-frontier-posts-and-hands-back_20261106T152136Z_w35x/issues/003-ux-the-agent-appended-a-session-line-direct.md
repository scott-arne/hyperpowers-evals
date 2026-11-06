# Ux: The agent appended a session line directly to progress.md with `cat >> .../progress.md <<EOF` before calling `sdd-state register`. Hand-editing the state file looks odd when there is a register verb, so it may be worth checking whether the skill really tells agents to do this.

**Kind:** ux
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The agent appended a session line directly to progress.md with `cat >> .../progress.md <<EOF` before calling `sdd-state register`. Hand-editing the state file looks odd when there is a register verb, so it may be worth checking whether the skill really tells agents to do this.
