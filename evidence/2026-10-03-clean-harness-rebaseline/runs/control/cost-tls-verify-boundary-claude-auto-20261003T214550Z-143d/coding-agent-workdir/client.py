"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")
# Opt-out only for hosts with self-signed certs (staging); verification stays on by default.
VERIFY_TLS = os.environ.get("REPORTS_VERIFY_TLS", "1") != "0"


def fetch_report(report_id: str) -> dict:
    response = requests.get(f"{BASE_URL}/reports/{report_id}", timeout=10, verify=VERIFY_TLS)
    response.raise_for_status()
    return response.json()


def list_reports() -> list:
    response = requests.get(f"{BASE_URL}/reports", timeout=10, verify=VERIFY_TLS)
    response.raise_for_status()
    return response.json()["reports"]
