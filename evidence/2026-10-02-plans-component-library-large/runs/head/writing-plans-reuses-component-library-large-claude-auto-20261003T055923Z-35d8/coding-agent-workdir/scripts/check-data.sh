#!/usr/bin/env bash
# CI gate for snapshot changes. --now is pinned to the snapshot time because
# the checked-in snapshots are stale by design.
set -euo pipefail
cd "$(dirname "$0")/.."
node tools/harbor.js verify --now=2026-10-01T09:30:00Z
