"""Pull the latest reports from staging into the local cache."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.staging.example")
os.environ.setdefault("REPORTS_TLS_VERIFY", "false")  # staging cert is self-signed

from client import list_reports  # noqa: E402

for report in list_reports():
    print(report["id"])
