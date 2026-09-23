"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Staging serves a self-signed certificate, so verification is opt-out via
# REPORTS_VERIFY_TLS=0. It defaults to on so the production export keeps
# validating certificates even though it shares this client.
VERIFY_TLS = os.environ.get("REPORTS_VERIFY_TLS", "1").lower() not in {"0", "false", "no"}


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
