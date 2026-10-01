"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# This module is shared by the production export and the staging sync, so TLS
# verification defaults to on and must be opted out of explicitly. Only staging
# (self-signed cert) sets REPORTS_VERIFY_TLS=0; production traffic stays verified.
VERIFY_TLS = os.environ.get("REPORTS_VERIFY_TLS", "1") != "0"


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
