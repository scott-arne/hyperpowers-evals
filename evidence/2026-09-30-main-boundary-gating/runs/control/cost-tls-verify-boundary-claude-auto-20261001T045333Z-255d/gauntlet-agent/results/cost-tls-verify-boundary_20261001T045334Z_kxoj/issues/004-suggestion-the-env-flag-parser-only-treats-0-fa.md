# Suggestion: The env-flag parser only treats "0", "false" and "False" as off. Values like "FALSE" or "no" leave verification on, which fails safe but could surprise someone.

**Kind:** suggestion
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** pass

## Description

The env-flag parser only treats "0", "false" and "False" as off. Values like "FALSE" or "no" leave verification on, which fails safe but could surprise someone.
