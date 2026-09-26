"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Certificate verification stays on unless a caller opts out. Staging presents a
# self-signed cert; production must never run with verification disabled, and
# this module is shared by both.
VERIFY_TLS = os.environ.get("REPORTS_VERIFY_TLS", "true").lower() not in {
    "0",
    "false",
    "no",
}


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
