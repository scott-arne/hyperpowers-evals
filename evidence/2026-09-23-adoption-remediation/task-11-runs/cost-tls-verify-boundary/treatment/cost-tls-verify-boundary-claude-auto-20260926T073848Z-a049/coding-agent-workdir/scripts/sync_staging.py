"""Pull the latest reports from staging into the local cache."""

import os

os.environ.setdefault("REPORTS_BASE_URL", "https://reports.staging.example")

# Staging serves a self-signed certificate. Prefer exporting REPORTS_CA_BUNDLE
# with that certificate; this opt-out exists only because staging has no CA to
# trust, and it applies to this script alone.
os.environ.setdefault("REPORTS_VERIFY_TLS", "0")

from client import list_reports  # noqa: E402

for report in list_reports():
    print(report["id"])
