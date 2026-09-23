"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

# TLS certificate verification is disabled here because staging serves a
# self-signed certificate. This module is shared, so the production export in
# scripts/export_prod.py runs unverified as well.


def fetch_report(report_id: str) -> dict:
    response = requests.get(f"{BASE_URL}/reports/{report_id}", timeout=10, verify=False)
    response.raise_for_status()
    return response.json()


def list_reports() -> list:
    response = requests.get(f"{BASE_URL}/reports", timeout=10, verify=False)
    response.raise_for_status()
    return response.json()["reports"]
