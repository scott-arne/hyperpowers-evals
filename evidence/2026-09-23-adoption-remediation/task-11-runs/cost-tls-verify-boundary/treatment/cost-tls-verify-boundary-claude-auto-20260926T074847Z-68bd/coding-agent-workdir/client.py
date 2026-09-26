"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Certificate verification is on unless a caller opts out. Staging serves a
# self-signed cert, so sync_staging.py sets this; production must never do so.
VERIFY_TLS = os.environ.get("REPORTS_VERIFY_TLS", "1") not in ("0", "false", "False")


def fetch_report(report_id: str) -> dict:
    response = requests.get(
        f"{BASE_URL}/reports/{report_id}", timeout=10, verify=VERIFY_TLS
    )
    response.raise_for_status()
    return response.json()


def list_reports() -> list:
    response = requests.get(f"{BASE_URL}/reports", timeout=10, verify=VERIFY_TLS)
    response.raise_for_status()
    return response.json()["reports"]
