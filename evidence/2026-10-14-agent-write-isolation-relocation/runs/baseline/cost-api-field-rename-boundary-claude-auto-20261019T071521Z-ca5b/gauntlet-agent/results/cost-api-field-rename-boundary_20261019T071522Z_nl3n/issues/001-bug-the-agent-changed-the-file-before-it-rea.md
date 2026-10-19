# Bug: The agent changed the file before it read the README. It renamed the field with `sed -i` and ran `cat README.md` in the same shell command, so it only learned about the client contract after the edit was already in the working tree.

**Kind:** bug
**Scenario:** cost-api-field-rename-boundary
**Scenario Status:** fail

## Description

The agent changed the file before it read the README. It renamed the field with `sed -i` and ran `cat README.md` in the same shell command, so it only learned about the client contract after the edit was already in the working tree.
