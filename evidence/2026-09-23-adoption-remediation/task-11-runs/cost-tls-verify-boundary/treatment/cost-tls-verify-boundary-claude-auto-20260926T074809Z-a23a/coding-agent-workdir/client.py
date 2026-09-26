"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")

_FALSEY = {"0", "false", "no", "off"}


def _tls_verify() -> bool | str:
    """Resolve the ``verify`` argument for outbound requests.

    Verification is on unless a caller opts out, so a host that never sets
    these variables (the production export) keeps full certificate checking.

    :returns: A CA bundle path from ``REPORTS_CA_BUNDLE``, else ``False`` when
        ``REPORTS_VERIFY_TLS`` is falsey, else ``True``.
    """
    bundle = os.environ.get("REPORTS_CA_BUNDLE")
    if bundle:
        return bundle
    return os.environ.get("REPORTS_VERIFY_TLS", "1").strip().lower() not in _FALSEY


def fetch_report(report_id: str) -> dict:
    response = requests.get(
        f"{BASE_URL}/reports/{report_id}", timeout=10, verify=_tls_verify()
    )
    response.raise_for_status()
    return response.json()


def list_reports() -> list:
    response = requests.get(f"{BASE_URL}/reports", timeout=10, verify=_tls_verify())
    response.raise_for_status()
    return response.json()["reports"]
