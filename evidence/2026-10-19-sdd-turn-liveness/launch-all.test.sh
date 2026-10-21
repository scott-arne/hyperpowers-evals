#!/usr/bin/env bash
# launch-all.test.sh
# Runs launch-all.sh with a stub launcher (LAUNCHER) that writes a log ending
# DONE, or exits 1 for one row, and checks the fail-closed manifest handling
# and the closing line.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
script="$here/launch-all.sh"
fail() { echo "FAIL: $*" >&2; exit 1; }
tmp=$(mktemp -d "${TMPDIR:-/tmp}/launch-all-test.XXXXXX") || fail "no temp directory"
trap 'rm -rf "$tmp"' EXIT
export LOGS="$tmp/logs"
stub="$tmp/stub.sh"
cat > "$stub" <<'STUB'
#!/usr/bin/env bash
mkdir -p "$LOGS"
log="$LOGS/$1-$2-$4.log"
echo "arm=$1" > "$log"
if [ "${STUB_FAIL:-}" = "$1-$2-$4" ]; then echo "FAILED 9" >> "$log"; exit 1; fi
echo "DONE 0" >> "$log"
STUB
export LAUNCHER="$stub"
t=$'\t'
pins() {
  for k in harness control treatment control_root treatment_root model cc cc_path provider subagent_models codex task_tools; do
    printf '%s\tvalue\n' "$k"
  done
}
manifest() { pins > "$tmp/manifest.tsv"; printf '%b' "$1" >> "$tmp/manifest.tsv"; }
reset() { rm -rf "$LOGS"; }

# 1. a malformed row (wrong field count) stops everything
reset; manifest "control${t}sdd-turn-liveness${t}1${t}p1\n"
bash "$script" "$tmp/manifest.tsv" 2>/dev/null && fail "malformed row launched"
[ ! -e "$LOGS" ] || fail "malformed row still launched something"
# 2. a duplicate row stops everything
reset; manifest "control${t}sdd-turn-liveness${t}1${t}p1${t}default\ncontrol${t}sdd-turn-liveness${t}1${t}p1${t}default\n"
bash "$script" "$tmp/manifest.tsv" 2>/dev/null && fail "duplicate row launched"
[ ! -e "$LOGS" ] || fail "duplicate row still launched something"
# 3. a row for another scenario stops everything
reset; manifest "control${t}sdd-turn-liveness${t}1${t}p1${t}default\ntreatment${t}other-scenario${t}1${t}p2${t}default\n"
bash "$script" "$tmp/manifest.tsv" 2>/dev/null && fail "other scenario launched"
[ ! -e "$LOGS" ] || fail "other scenario still launched something"
# 4. an unknown pin key is malformed
reset; { pins; printf 'bogus\tx\n'; printf 'control\tsdd-turn-liveness\t1\tp1\tdefault\n'; } > "$tmp/manifest.tsv"
bash "$script" "$tmp/manifest.tsv" 2>/dev/null && fail "unknown pin key launched"
# 5. a non-zero child fails the closing status
reset; manifest "control${t}sdd-turn-liveness${t}1${t}p1${t}default\ntreatment${t}sdd-turn-liveness${t}1${t}p2${t}default\n"
out="$tmp/out5"
STUB_FAIL=treatment-sdd-turn-liveness-p2 bash "$script" "$tmp/manifest.tsv" > "$out" 2>/dev/null && fail "failed child passed"
grep -qF "launchers non-zero: 1; manifest rows without a DONE log: 1" "$out" || fail "closing line misses the failure: $(tail -n 1 "$out")"
# 5b. p and r rows both launch
reset; manifest "control${t}sdd-turn-liveness${t}1${t}p1${t}default\ntreatment${t}sdd-turn-liveness${t}1${t}r1${t}default\n"
out="$tmp/out5b"
bash "$script" "$tmp/manifest.tsv" > "$out" 2>/dev/null || fail "p and r rows did not launch cleanly"
# 6. a clean manifest ends with the clean closing line
reset; manifest "control${t}sdd-turn-liveness${t}1${t}p1${t}default\ntreatment${t}sdd-turn-liveness${t}1${t}p2${t}default\n"
out="$tmp/out6"
bash "$script" "$tmp/manifest.tsv" > "$out" 2>/dev/null || fail "clean manifest failed"
[ "$(tail -n 1 "$out")" = "all launches finished; launchers non-zero: 0; manifest rows without a DONE log: 0" ] || fail "closing line: $(tail -n 1 "$out")"
echo "PASS: launch-all.sh fails closed on a bad manifest and reports child failures"
