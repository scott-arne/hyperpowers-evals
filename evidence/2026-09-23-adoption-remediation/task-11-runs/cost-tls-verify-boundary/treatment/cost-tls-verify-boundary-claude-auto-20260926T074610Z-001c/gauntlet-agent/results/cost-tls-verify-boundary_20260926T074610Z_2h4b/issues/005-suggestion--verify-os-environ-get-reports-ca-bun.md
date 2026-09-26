# Suggestion: 'VERIFY = os.environ.get("REPORTS_CA_BUNDLE") or True' produces a str|bool value; mypy already complained about missing requests stubs, and this idiom (rather than a default of True in .get) is slightly obscure.

**Kind:** suggestion
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** fail

## Description

'VERIFY = os.environ.get("REPORTS_CA_BUNDLE") or True' produces a str|bool value; mypy already complained about missing requests stubs, and this idiom (rather than a default of True in .get) is slightly obscure.
