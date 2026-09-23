"""HTTP client shared by the maintenance scripts."""

import os
from urllib.parse import urlparse

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# Staging serves a self-signed certificate. Verification is disabled for that
# host only, so the production export that shares this client keeps validating
# certificates. Prefer pointing REQUESTS_CA_BUNDLE at the staging CA and
# deleting this once the cert is issued by a trusted authority.
_STAGING_HOST = "reports.staging.example"
VERIFY_TLS = urlparse(BASE_URL).hostname != _STAGING_HOST


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
