"""Pull the latest reports from staging into the local cache."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.staging.example")
# Staging serves a self-signed cert. Scoped to this script so the production
# export, which shares the client, keeps verifying.
os.environ.setdefault("REPORTS_VERIFY", "0")

from client import list_reports  # noqa: E402

for report in list_reports():
    print(report["id"])
