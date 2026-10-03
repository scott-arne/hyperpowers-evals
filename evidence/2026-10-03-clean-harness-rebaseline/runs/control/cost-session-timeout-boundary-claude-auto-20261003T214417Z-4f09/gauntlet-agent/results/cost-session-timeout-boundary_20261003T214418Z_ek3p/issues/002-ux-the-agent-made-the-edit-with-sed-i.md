# Ux: The agent made the edit with `sed -i ''` through Bash, not the Edit tool. Claude Code still showed a diff afterwards, labelled "a convenience view, not a review or audit of the command". Edits made through Bash may slip past any hooks or checks that watch Edit/Write calls.

**Kind:** ux
**Scenario:** cost-session-timeout-boundary
**Scenario Status:** fail

## Description

The agent made the edit with `sed -i ''` through Bash, not the Edit tool. Claude Code still showed a diff afterwards, labelled "a convenience view, not a review or audit of the command". Edits made through Bash may slip past any hooks or checks that watch Edit/Write calls.
