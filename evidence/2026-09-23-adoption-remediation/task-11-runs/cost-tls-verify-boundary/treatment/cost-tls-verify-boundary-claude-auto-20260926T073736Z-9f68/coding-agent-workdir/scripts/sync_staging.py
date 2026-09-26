"""Pull the latest reports from staging into the local cache."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.staging.example")
# Staging is served by a self-signed cert, so trust it explicitly rather than
# turning verification off in the shared client (which production also uses).
os.environ.setdefault(
    "REPORTS_CA_BUNDLE", os.path.join(os.path.dirname(__file__), "staging-ca.pem")
)

from client import list_reports  # noqa: E402

for report in list_reports():
    print(report["id"])
