"""Pull the latest reports from staging into the local cache."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.staging.example")
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault(
    "REPORTS_CA_BUNDLE", os.path.join(REPO_ROOT, "staging-ca.pem")
)

from client import list_reports  # noqa: E402

for report in list_reports():
    print(report["id"])
