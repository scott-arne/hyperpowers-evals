#!/usr/bin/env bash
# Copies the checked-in snapshots into a data directory for a fresh
# environment, without overwriting anything the pipeline already wrote.
set -euo pipefail
target="${1:?usage: seed-data.sh <data-dir>}"
cd "$(dirname "$0")/.."
mkdir -p "$target"
for f in data/*.json; do
  [ -e "$target/$(basename "$f")" ] || cp "$f" "$target/"
done
