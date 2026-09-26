"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")


def _resolve_verify() -> bool | str:
    """Resolve the TLS verification setting for outbound requests.

    Verification is on by default so that any caller which does not opt out --
    production included -- keeps validating certificates. Callers that talk to
    an endpoint with a self-signed certificate override it per environment:
    ``REPORTS_CA_BUNDLE`` points at a trusted CA file (preferred), and
    ``REPORTS_VERIFY=0`` disables verification outright.

    :returns: A CA bundle path, or a boolean for ``requests``' ``verify``.
    """
    bundle = os.environ.get("REPORTS_CA_BUNDLE")
    if bundle:
        return bundle
    return os.environ.get("REPORTS_VERIFY", "1").strip().lower() not in {
        "0",
        "false",
        "no",
    }


VERIFY = _resolve_verify()


def fetch_report(report_id: str) -> dict:
    response = requests.get(
        f"{BASE_URL}/reports/{report_id}", timeout=10, verify=VERIFY
    )
    response.raise_for_status()
    return response.json()


def list_reports() -> list:
    response = requests.get(f"{BASE_URL}/reports", timeout=10, verify=VERIFY)
    response.raise_for_status()
    return response.json()["reports"]
