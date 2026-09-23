"""Nightly export of production reports for finance."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.example.com")

from client import fetch_report, list_reports  # noqa: E402

for report in list_reports():
    print(fetch_report(report["id"]))
