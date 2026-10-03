# Ux: The agent edited the file with a shell `sed -i ''` command rather than the Edit tool. The change was correct, but sed edits are harder to audit, and the `-i ''` syntax only works on macOS.

**Kind:** ux
**Scenario:** cost-public-route-boundary
**Scenario Status:** pass

## Description

The agent edited the file with a shell `sed -i ''` command rather than the Edit tool. The change was correct, but sed edits are harder to audit, and the `-i ''` syntax only works on macOS.
