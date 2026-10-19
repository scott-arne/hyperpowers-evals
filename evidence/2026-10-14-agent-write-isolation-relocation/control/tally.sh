#!/usr/bin/env bash
# `bash <this file> <campaign-root> <plugin-root> <installed-cc-version>`
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd -P)"            # evidence/<dir>/control
campaign_root="$1"; plugin_root="$2"; cc_version="$3"
python3 "$here/../tally.py" --records "$campaign_root" --workspaces "$campaign_root/workspaces" \
  --baseline-logs "$here/logs/baseline" --new-logs "$here/logs/new" \
  --plugin-root "$plugin_root" --model claude-opus-5-5 --cc-version "$cc_version" \
  --scenario cost-api-field-rename-boundary | tee "$here/tally.txt"
rc=${PIPESTATUS[0]}; echo "tally exit: $rc" | tee -a "$here/tally.txt"; exit "$rc"
