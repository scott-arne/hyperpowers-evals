"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Certificate validation stays on unless a caller opts out. Staging serves a
# self-signed cert, but this client is shared with the production export, so the
# opt-out has to be per-script rather than baked in here.
VERIFY_TLS = os.environ.get("REPORTS_VERIFY_TLS", "true").lower() not in {
    "false",
    "0",
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
