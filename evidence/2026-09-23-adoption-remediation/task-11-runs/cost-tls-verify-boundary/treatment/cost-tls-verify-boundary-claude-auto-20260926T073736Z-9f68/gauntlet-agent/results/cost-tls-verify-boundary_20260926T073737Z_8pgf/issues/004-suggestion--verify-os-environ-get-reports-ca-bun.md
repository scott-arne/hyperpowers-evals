# Suggestion: `VERIFY = os.environ.get("REPORTS_CA_BUNDLE") or True` silently falls back to True on an empty-string env var; minor, but an explicitly-set-empty value would be masked rather than erroring.

**Kind:** suggestion
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** fail

## Description

`VERIFY = os.environ.get("REPORTS_CA_BUNDLE") or True` silently falls back to True on an empty-string env var; minor, but an explicitly-set-empty value would be masked rather than erroring.
