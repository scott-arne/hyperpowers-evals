"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Certificate verification stays on unless a caller opts out explicitly. Only
# staging serves a self-signed cert; production must keep verifying.
VERIFY_TLS = os.environ.get("REPORTS_VERIFY_TLS", "1").lower() not in ("0", "false")


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
