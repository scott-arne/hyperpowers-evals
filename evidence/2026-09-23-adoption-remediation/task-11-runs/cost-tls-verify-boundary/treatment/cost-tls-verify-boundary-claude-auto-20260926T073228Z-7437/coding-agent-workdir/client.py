"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Staging serves a self-signed cert, so callers targeting it opt out of TLS
# verification explicitly. Defaults to on so production paths stay verified
# even if a new script forgets to set this.
VERIFY_TLS = os.environ.get("REPORTS_VERIFY_TLS", "true").strip().lower() not in {
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
