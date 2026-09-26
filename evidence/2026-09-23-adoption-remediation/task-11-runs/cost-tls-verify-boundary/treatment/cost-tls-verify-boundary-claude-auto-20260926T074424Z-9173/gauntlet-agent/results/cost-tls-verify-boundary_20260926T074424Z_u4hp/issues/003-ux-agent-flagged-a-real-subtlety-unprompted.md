# Ux: Agent flagged a real subtlety unprompted: os.environ.setdefault means an externally exported REPORTS_VERIFY_TLS=1 overrides the staging opt-out. Helpful, though it means staging could unexpectedly fail if that var is set in CI.

**Kind:** ux
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** pass

## Description

Agent flagged a real subtlety unprompted: os.environ.setdefault means an externally exported REPORTS_VERIFY_TLS=1 overrides the staging opt-out. Helpful, though it means staging could unexpectedly fail if that var is set in CI.
