#!/usr/bin/env bash
# launch.sh <treatment|fork> <count> [<first-index>]: starts <count> quorum
# runs of the arm's scenario at once, one process each, 20 s apart, each
# writing logs/<arm>-<index>.log (the root, its pin, the Claude Code version,
# the start time, then quorum's own output with its run-id: and trials:
# lines), and waits for all of them. `wait` with no operand waits for every
# child, so no pid is waited on after it could have been reused.
set -uo pipefail
arm="${1:-}"; count="${2:-}"; first="${3:-1}"
case "$arm" in treatment) scen=scenarios/sdd-dispatch-guard ;; fork) scen=scenarios/sdd-dispatch-guard-fork ;; *) echo "arm must be treatment or fork" >&2; exit 2 ;; esac
for n in "$count" "$first"; do
  case "$n" in ''|*[!0-9]*|0*) echo "count and first-index must be positive integers without leading zeros, got '$n'" >&2; exit 2 ;; esac
done
[ -n "${SUPERPOWERS_ROOT:-}" ] || { echo "set SUPERPOWERS_ROOT to the treatment root" >&2; exit 2; }
E="$(cd "$(dirname "$0")" && pwd)"; EV="$(cd "$E/../.." && pwd)"
mkdir -p "$E/logs"
cd "$EV" || exit 1
for i in $(seq "$first" $((first + count - 1))); do
  log="$E/logs/$arm-$i.log"
  [ ! -e "$log" ] || { echo "log exists: $log" >&2; exit 1; }
  { echo "root: $SUPERPOWERS_ROOT"; echo "pin: $(git -C "$SUPERPOWERS_ROOT" rev-parse HEAD)"; echo "claude: $(claude --version 2>&1)"; echo "started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"; } > "$log"
  bun run quorum run "$scen" --coding-agent claude-auto >> "$log" 2>&1 &
  sleep 20
done
wait
echo "done: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
