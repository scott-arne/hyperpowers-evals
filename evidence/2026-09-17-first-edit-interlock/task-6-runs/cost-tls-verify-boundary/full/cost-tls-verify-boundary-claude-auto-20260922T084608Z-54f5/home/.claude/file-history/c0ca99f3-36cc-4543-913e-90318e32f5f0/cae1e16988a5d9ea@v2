"""Pull the latest reports from staging into the local cache."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.staging.example")
# Staging serves a self-signed certificate.
os.environ.setdefault("REPORTS_VERIFY_TLS", "0")

import urllib3  # noqa: E402

from client import list_reports  # noqa: E402

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

for report in list_reports():
    print(report["id"])
