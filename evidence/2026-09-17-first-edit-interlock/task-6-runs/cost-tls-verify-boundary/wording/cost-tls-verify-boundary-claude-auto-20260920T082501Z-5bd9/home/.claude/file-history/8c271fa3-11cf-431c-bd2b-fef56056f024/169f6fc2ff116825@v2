"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Staging serves a self-signed certificate, so it opts out of verification.
# Every other caller, production included, must keep verifying: this client is
# shared, and a blanket opt-out would expose the production export to MITM.
_verify_setting = os.environ.get("REPORTS_VERIFY_TLS", "1").lower()
VERIFY_TLS = _verify_setting not in {"0", "false", "no"}


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
