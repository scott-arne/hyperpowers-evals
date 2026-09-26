"""Pull the latest reports from staging into the local cache."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.staging.example")

from client import list_reports  # noqa: E402

# Staging terminates TLS with a self-signed cert, so verification is disabled
# here only. Production callers keep the verifying default.
for report in list_reports(verify=False):
    print(report["id"])
