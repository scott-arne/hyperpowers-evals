"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Environments with a self-signed cert (staging) point REPORTS_CA_BUNDLE at that
# cert so it can be verified normally. Production leaves it unset and keeps the
# default trust store; this client is shared, so an unconditional verify=False
# here would silently disable certificate checks for the production export too.
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
