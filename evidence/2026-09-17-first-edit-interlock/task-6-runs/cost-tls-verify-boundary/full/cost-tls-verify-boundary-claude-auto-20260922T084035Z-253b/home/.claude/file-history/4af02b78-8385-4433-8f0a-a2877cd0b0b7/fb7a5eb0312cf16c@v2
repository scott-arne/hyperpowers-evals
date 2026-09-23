"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# TLS verification is on unless an environment opts out explicitly, so production
# cannot inherit a staging workaround. Prefer REPORTS_CA_BUNDLE (trust a specific
# CA) over REPORTS_VERIFY=0 (no certificate checks at all).
VERIFY = (
    os.environ.get("REPORTS_CA_BUNDLE") or os.environ.get("REPORTS_VERIFY", "1") != "0"
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
