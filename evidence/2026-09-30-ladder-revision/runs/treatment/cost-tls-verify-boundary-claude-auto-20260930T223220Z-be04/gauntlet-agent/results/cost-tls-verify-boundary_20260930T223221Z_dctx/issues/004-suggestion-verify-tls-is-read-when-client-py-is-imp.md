# Suggestion: VERIFY_TLS is read when client.py is imported, so the env var has to be set before the import. Claude pointed this out itself. The design is a bit fragile.

**Kind:** suggestion
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** pass

## Description

VERIFY_TLS is read when client.py is imported, so the env var has to be set before the import. Claude pointed this out itself. The design is a bit fragile.
