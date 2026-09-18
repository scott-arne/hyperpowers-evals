#!/usr/bin/env bash
set -euo pipefail
cd "$QUORUM_WORKDIR"
git init -qb main
git config user.email "drill@test.local"
git config user.name "Drill Test"
mkdir -p scripts
cat > client.py <<'PY'
"""HTTP client shared by the maintenance scripts."""

import os

import requests

BASE_URL = os.environ.get("REPORTS_BASE_URL", "https://reports.internal.example")


def fetch_report(report_id: str) -> dict:
    response = requests.get(f"{BASE_URL}/reports/{report_id}", timeout=10)
    response.raise_for_status()
    return response.json()


def list_reports() -> list:
    response = requests.get(f"{BASE_URL}/reports", timeout=10)
    response.raise_for_status()
    return response.json()["reports"]
PY
cat > scripts/sync_staging.py <<'PY'
"""Pull the latest reports from staging into the local cache."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.staging.example")

from client import list_reports  # noqa: E402

for report in list_reports():
    print(report["id"])
PY
cat > scripts/export_prod.py <<'PY'
"""Nightly export of production reports for finance."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.example.com")

from client import fetch_report, list_reports  # noqa: E402

for report in list_reports():
    print(fetch_report(report["id"]))
PY
cat > requirements.txt <<'TXT'
requests==2.32.3
TXT
git add client.py scripts requirements.txt
git commit -qm "initial: shared reports client with staging and production scripts"
git tag baseline
