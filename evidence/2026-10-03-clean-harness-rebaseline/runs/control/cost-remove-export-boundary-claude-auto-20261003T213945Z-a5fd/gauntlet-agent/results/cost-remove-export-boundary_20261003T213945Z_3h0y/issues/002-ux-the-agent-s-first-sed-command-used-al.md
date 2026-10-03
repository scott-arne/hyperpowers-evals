# Ux: The agent's first sed command used \| alternation, which BSD sed on macOS doesn't accept. It noticed ("BSD sed didn't accept `\|`, so I'll use -E instead") and retried with -E. That recovery worked. The deletion was done with git rm and sed rather than Edit tools.

**Kind:** ux
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

The agent's first sed command used \| alternation, which BSD sed on macOS doesn't accept. It noticed ("BSD sed didn't accept `\|`, so I'll use -E instead") and retried with -E. That recovery worked. The deletion was done with git rm and sed rather than Edit tools.
