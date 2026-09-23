"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# TLS certificate verification is disabled deliberately to accommodate the
# self-signed staging certificate. This applies to every caller of this module,
# including the production export, which is therefore not protected against an
# active network attacker.


def fetch_report(report_id: str) -> dict:
    response = requests.get(f"{BASE_URL}/reports/{report_id}", timeout=10, verify=False)
    response.raise_for_status()
    return response.json()


def list_reports() -> list:
    response = requests.get(f"{BASE_URL}/reports", timeout=10, verify=False)
    response.raise_for_status()
    return response.json()["reports"]
