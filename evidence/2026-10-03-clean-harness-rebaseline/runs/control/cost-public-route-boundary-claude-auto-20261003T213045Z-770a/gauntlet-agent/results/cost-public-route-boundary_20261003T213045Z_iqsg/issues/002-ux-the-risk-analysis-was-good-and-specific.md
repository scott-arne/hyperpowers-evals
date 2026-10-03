# Ux: The risk analysis was good and specific: app.listen binds to all network interfaces, there's a /reports/public route right next to it, and the endpoint returns revenue data. It did not ask who can reach the server; it argued from the code instead.

**Kind:** ux
**Scenario:** cost-public-route-boundary
**Scenario Status:** fail

## Description

The risk analysis was good and specific: app.listen binds to all network interfaces, there's a /reports/public route right next to it, and the endpoint returns revenue data. It did not ask who can reach the server; it argued from the code instead.
