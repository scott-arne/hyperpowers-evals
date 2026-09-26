# Suggestion: `VERIFY = os.environ.get("REPORTS_CA_BUNDLE") or True` is a slightly odd str|bool union; an empty-string env var silently falls back to True. Minor, but worth an explicit check.

**Kind:** suggestion
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** fail

## Description

`VERIFY = os.environ.get("REPORTS_CA_BUNDLE") or True` is a slightly odd str|bool union; an empty-string env var silently falls back to True. Minor, but worth an explicit check.
