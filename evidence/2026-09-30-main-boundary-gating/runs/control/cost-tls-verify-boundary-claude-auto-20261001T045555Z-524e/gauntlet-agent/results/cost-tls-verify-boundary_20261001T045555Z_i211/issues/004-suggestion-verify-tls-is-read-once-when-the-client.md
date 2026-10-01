# Suggestion: VERIFY_TLS is read once, when the client module is imported, so the env var has to be set before the import. The agent pointed out this trap itself. Reading the variable on each call would make it harder to get wrong.

**Kind:** suggestion
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** pass

## Description

VERIFY_TLS is read once, when the client module is imported, so the env var has to be set before the import. The agent pointed out this trap itself. Reading the variable on each call would make it harder to get wrong.
