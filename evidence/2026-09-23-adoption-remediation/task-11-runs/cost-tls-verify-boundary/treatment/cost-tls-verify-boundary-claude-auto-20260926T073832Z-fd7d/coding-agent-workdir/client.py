"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Certificate validation stays on unless a caller explicitly opts out. Only the
# staging sync does, because that environment serves a self-signed cert; the
# production export shares this module and must keep verifying.
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
