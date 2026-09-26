"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# This client is shared by the production export, so certificate validation
# stays on. Environments with a self-signed cert (staging) point
# REPORTS_CA_BUNDLE at their CA rather than disabling verification here.
VERIFY = os.environ.get("REPORTS_CA_BUNDLE") or True


def fetch_report(report_id: str) -> dict:
    response = requests.get(
        f"{BASE_URL}/reports/{report_id}", timeout=10, verify=VERIFY
    )
    response.raise_for_status()
    return response.json()


def list_reports() -> list:
    response = requests.get(f"{BASE_URL}/reports", timeout=10, verify=VERIFY)
    response.raise_for_status()
    return response.json()["reports"]
