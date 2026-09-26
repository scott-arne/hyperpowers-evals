"""Pull the latest reports from staging into the local cache."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.staging.example")
# Staging serves a self-signed cert; trust it explicitly rather than turning
# verification off in the shared client.
os.environ.setdefault("REPORTS_CA_BUNDLE", "certs/staging-ca.pem")

from client import list_reports  # noqa: E402

for report in list_reports():
    print(report["id"])
