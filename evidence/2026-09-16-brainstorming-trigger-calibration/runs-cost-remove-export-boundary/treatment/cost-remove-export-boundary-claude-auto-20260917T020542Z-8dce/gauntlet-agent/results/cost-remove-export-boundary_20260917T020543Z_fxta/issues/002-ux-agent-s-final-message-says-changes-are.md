# Ux: Agent's final message says "Changes are staged/unstaged in the working tree; not committed" — accurate but oddly phrased; the `git rm` actually staged the deletion while the index.html edit is unstaged, a mixed state the user may not expect.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

Agent's final message says "Changes are staged/unstaged in the working tree; not committed" — accurate but oddly phrased; the `git rm` actually staged the deletion while the index.html edit is unstaged, a mixed state the user may not expect.
