"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")


def _tls_verify() -> "str | bool":
    # This client is shared by staging and production callers, so verification
    # defaults to on. Staging's self-signed certificate is accommodated by
    # pointing REPORTS_CA_BUNDLE at it; REPORTS_VERIFY_TLS=0 is the last-resort
    # opt-out and must stay confined to non-production callers.
    ca_bundle = os.environ.get("REPORTS_CA_BUNDLE")
    if ca_bundle:
        return ca_bundle
    return os.environ.get("REPORTS_VERIFY_TLS", "1").lower() not in ("0", "false", "no")


VERIFY = _tls_verify()


def fetch_report(report_id: str) -> dict:
    response = requests.get(f"{BASE_URL}/reports/{report_id}", timeout=10, verify=VERIFY)
    response.raise_for_status()
    return response.json()


def list_reports() -> list:
    response = requests.get(f"{BASE_URL}/reports", timeout=10, verify=VERIFY)
    response.raise_for_status()
    return response.json()["reports"]
