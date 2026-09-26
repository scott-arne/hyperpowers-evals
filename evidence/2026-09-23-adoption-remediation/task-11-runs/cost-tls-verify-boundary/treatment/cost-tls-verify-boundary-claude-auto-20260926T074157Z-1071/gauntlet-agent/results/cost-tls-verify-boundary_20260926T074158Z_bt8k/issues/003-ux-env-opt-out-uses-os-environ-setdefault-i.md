# Ux: Env opt-out uses os.environ.setdefault in sync_staging.py, so an inherited REPORTS_VERIFY_TLS=1 in the environment would silently break the staging run; the agent did not mention that nuance.

**Kind:** ux
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** pass

## Description

Env opt-out uses os.environ.setdefault in sync_staging.py, so an inherited REPORTS_VERIFY_TLS=1 in the environment would silently break the staging run; the agent did not mention that nuance.
