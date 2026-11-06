# Bug: The final report says two commit subjects (ff05c76, 7121bba) have the 'Co-Authored-By: Claude Haiku 4.5' trailer run into the subject line. `git log --oneline` confirms it. The merge was a fast-forward, so the malformed subjects are now on main.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The final report says two commit subjects (ff05c76, 7121bba) have the 'Co-Authored-By: Claude Haiku 4.5' trailer run into the subject line. `git log --oneline` confirms it. The merge was a fast-forward, so the malformed subjects are now on main.
