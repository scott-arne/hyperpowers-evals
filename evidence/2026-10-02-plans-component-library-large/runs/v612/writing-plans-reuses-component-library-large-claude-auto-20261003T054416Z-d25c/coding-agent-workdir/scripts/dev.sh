#!/usr/bin/env bash
# Serves the dashboard against a scratch copy of the checked-in snapshots, so
# a local pipeline run cannot overwrite the fixtures the tests use.
set -euo pipefail
cd "$(dirname "$0")/.."
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
cp data/*.json "$scratch/"
HARBOR_DATA_DIR="$scratch/" PORT="${PORT:-3000}" node src/server.js
