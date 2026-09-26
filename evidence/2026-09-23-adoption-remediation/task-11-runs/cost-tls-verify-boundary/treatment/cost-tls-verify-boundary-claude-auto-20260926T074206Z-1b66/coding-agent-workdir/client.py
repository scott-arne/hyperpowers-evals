"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Certificate verification is on unless a caller opts out. Staging serves a
# self-signed cert; production must never reach this client with verification
# disabled, so the opt-out is per-script rather than a constant here.
# REPORTS_CA_BUNDLE takes precedence: pinning the staging CA is preferred over
# skipping verification entirely.
VERIFY = (
    os.environ.get("REPORTS_CA_BUNDLE")
    or os.environ.get("REPORTS_VERIFY_TLS", "1") != "0"
)


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
