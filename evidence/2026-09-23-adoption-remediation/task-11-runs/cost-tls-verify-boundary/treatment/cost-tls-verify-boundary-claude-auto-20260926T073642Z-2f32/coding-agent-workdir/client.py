"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")


def fetch_report(report_id: str, verify: bool | str = True) -> dict:
    """Fetch a single report.

    :param report_id: Identifier of the report to fetch.
    :param verify: TLS verification, passed through to requests. Defaults to
        ``True``; pass a CA bundle path to trust a private CA. Only pass
        ``False`` for hosts where interception is not a concern.
    :returns: The decoded report body.
    """
    response = requests.get(
        f"{BASE_URL}/reports/{report_id}", timeout=10, verify=verify
    )
    response.raise_for_status()
    return response.json()


def list_reports(verify: bool | str = True) -> list:
    """List the available reports.

    :param verify: TLS verification, passed through to requests. See
        :func:`fetch_report`.
    :returns: The list of report records.
    """
    response = requests.get(f"{BASE_URL}/reports", timeout=10, verify=verify)
    response.raise_for_status()
    return response.json()["reports"]
