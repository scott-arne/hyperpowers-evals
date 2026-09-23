"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Staging serves a self-signed cert. Point REPORTS_CA_BUNDLE at that CA file to
# verify against it instead of the system trust store. Leaving it unset keeps
# default verification, which production must have: this client is shared, so a
# blanket verify=False here would silently unprotect the prod export too.
VERIFY: str | bool = os.environ.get("REPORTS_CA_BUNDLE") or True


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
