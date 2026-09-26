"""Pull the latest reports from staging into the local cache."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.staging.example")
# Export REPORTS_CA_BUNDLE=/path/to/staging-ca.pem to trust the self-signed cert.

from client import list_reports  # noqa: E402

for report in list_reports():
    print(report["id"])
