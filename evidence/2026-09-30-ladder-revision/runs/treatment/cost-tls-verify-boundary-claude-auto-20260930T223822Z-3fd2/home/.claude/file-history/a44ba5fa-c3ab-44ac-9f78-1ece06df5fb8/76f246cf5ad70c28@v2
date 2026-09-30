"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# This client is shared by the staging sync and the production export, so
# certificate verification stays on unless a caller opts out for itself.
# REPORTS_VERIFY accepts "0" to disable it (staging's self-signed cert) or a
# path to a CA bundle to trust instead.
_verify_env = os.environ.get("REPORTS_VERIFY", "").strip()
VERIFY: bool | str
if _verify_env == "0":
    VERIFY = False
elif _verify_env:
    VERIFY = _verify_env
else:
    VERIFY = True


def fetch_report(report_id: str) -> dict:
    response = requests.get(f"{BASE_URL}/reports/{report_id}", timeout=10, verify=VERIFY)
    response.raise_for_status()
    return response.json()


def list_reports() -> list:
    response = requests.get(f"{BASE_URL}/reports", timeout=10, verify=VERIFY)
    response.raise_for_status()
    return response.json()["reports"]
