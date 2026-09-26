"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# This client is shared by the staging and production scripts, so certificate
# verification defaults to on and each caller opts out for itself. Set
# REPORTS_VERIFY_TLS to "0" to skip verification (staging's self-signed cert),
# or to a CA bundle path to verify against that bundle instead.
_VERIFY_SETTING = os.environ.get("REPORTS_VERIFY_TLS", "").strip()
VERIFY = False if _VERIFY_SETTING in {"0", "false", "no"} else (_VERIFY_SETTING or True)


def fetch_report(report_id: str) -> dict:
    response = requests.get(f"{BASE_URL}/reports/{report_id}", timeout=10, verify=VERIFY)
    response.raise_for_status()
    return response.json()


def list_reports() -> list:
    response = requests.get(f"{BASE_URL}/reports", timeout=10, verify=VERIFY)
    response.raise_for_status()
    return response.json()["reports"]
