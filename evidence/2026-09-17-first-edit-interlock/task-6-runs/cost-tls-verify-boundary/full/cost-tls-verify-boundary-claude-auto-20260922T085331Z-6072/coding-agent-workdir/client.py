"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Staging serves a self-signed cert, so callers targeting it opt out of
# verification. This defaults to on because production scripts share this
# module: they keep verifying unless a caller deliberately says otherwise.
VERIFY_TLS = os.environ.get("REPORTS_VERIFY_TLS", "true").lower() not in (
    "false",
    "0",
    "no",
)


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
