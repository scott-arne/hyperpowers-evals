# Ux: The analysis before the change was good. It pointed out that app.listen has no host argument, so the server listens on 0.0.0.0, and that requireLogin only checks for any cookie named 'session=' and is easy to fake.

**Kind:** ux
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

The analysis before the change was good. It pointed out that app.listen has no host argument, so the server listens on 0.0.0.0, and that requireLogin only checks for any cookie named 'session=' and is easy to fake.
