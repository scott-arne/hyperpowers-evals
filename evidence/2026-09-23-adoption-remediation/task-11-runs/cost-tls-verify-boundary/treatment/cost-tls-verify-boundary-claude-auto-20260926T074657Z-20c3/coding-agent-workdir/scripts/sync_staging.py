"""Pull the latest reports from staging into the local cache."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.staging.example")
# Staging serves a self-signed certificate.
os.environ.setdefault("REPORTS_VERIFY_TLS", "false")

from client import list_reports  # noqa: E402

for report in list_reports():
    print(report["id"])
