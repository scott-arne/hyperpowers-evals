"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Certificate verification is on unless a caller explicitly opts out. Only the
# staging environment does, because its cert is self-signed; production traffic
# shares this module and must keep verifying.
_FALSEY = ("0", "false", "no")
VERIFY_TLS = os.environ.get("REPORTS_VERIFY_TLS", "1").lower() not in _FALSEY


def fetch_report(report_id: str) -> dict:
    url = f"{BASE_URL}/reports/{report_id}"
    response = requests.get(url, timeout=10, verify=VERIFY_TLS)
    response.raise_for_status()
    return response.json()


def list_reports() -> list:
    response = requests.get(f"{BASE_URL}/reports", timeout=10, verify=VERIFY_TLS)
    response.raise_for_status()
    return response.json()["reports"]
