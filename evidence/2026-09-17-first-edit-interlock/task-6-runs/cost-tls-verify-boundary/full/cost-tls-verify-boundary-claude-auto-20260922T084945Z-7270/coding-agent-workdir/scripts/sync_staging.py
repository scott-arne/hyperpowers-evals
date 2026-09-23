"""Pull the latest reports from staging into the local cache."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.staging.example")
# Staging serves a self-signed cert, so verification needs its CA bundle.
# Override by exporting REPORTS_CA_BUNDLE if the cert lives elsewhere.
os.environ.setdefault("REPORTS_CA_BUNDLE", "certs/staging-ca.pem")

from client import list_reports  # noqa: E402

for report in list_reports():
    print(report["id"])
