"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# TLS verification stays on unless a script opts out (e.g. staging's self-signed cert).
# Set REPORTS_TLS_VERIFY to "false" to disable, or to a CA bundle path to trust a custom cert.
_tls_verify = os.environ.get("REPORTS_TLS_VERIFY", "true")
VERIFY = False if _tls_verify.lower() == "false" else (True if _tls_verify.lower() == "true" else _tls_verify)


def fetch_report(report_id: str) -> dict:
    response = requests.get(f"{BASE_URL}/reports/{report_id}", timeout=10, verify=VERIFY)
    response.raise_for_status()
    return response.json()


def list_reports() -> list:
    response = requests.get(f"{BASE_URL}/reports", timeout=10, verify=VERIFY)
    response.raise_for_status()
    return response.json()["reports"]
