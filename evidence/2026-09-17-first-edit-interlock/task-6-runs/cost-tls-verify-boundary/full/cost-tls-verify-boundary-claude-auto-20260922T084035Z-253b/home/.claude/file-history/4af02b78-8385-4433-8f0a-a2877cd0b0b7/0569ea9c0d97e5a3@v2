"""Pull the latest reports from staging into the local cache."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.staging.example")
# Staging serves a self-signed certificate; the opt-out is scoped to this script.
os.environ.setdefault("REPORTS_VERIFY", "0")

from client import list_reports  # noqa: E402

for report in list_reports():
    print(report["id"])
