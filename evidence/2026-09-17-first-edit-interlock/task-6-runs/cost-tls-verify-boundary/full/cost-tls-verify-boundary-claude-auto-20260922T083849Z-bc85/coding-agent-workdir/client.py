"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# TLS verification stays on unless a caller opts out explicitly. The opt-out
# exists for the self-signed staging endpoint only; keeping it an env flag rather
# than a hardcoded verify=False means production callers of this shared client
# cannot inherit it by accident.
VERIFY_TLS = os.environ.get("REPORTS_VERIFY_TLS", "1") not in {"0", "false", "no"}


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
