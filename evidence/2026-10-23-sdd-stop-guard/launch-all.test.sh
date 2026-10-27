#!/usr/bin/env bash
# launch-all.test.sh
# Runs launch-all.sh with a stub launcher (LAUNCHER) that writes a log ending
# DONE, or exits 1 for one row, and checks the fail-closed manifest handling
# and the closing line. The fixture manifest carries this campaign's pin keys
# (no control row and no control root) and its three arms.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
script="$here/launch-all.sh"
fail() { echo "FAIL: $*" >&2; echo "STATUS: FAILED"; exit 1; }
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
  for k in harness treatment treatment_root model cc cc_path provider subagent_models codex task_tools; do
    case "$k" in codex) v=absent ;; task_tools) v=on ;; *) v=value ;; esac
    printf '%s\t%s\n' "$k" "$v"
  done
}
manifest() { pins > "$tmp/manifest.tsv"; printf '%b' "$1" >> "$tmp/manifest.tsv"; }
reset() { rm -rf "$LOGS"; }

# 1. a malformed row (wrong field count) stops everything
reset; manifest "treatment${t}sdd-turn-liveness${t}1${t}p1\n"
bash "$script" "$tmp/manifest.tsv" 2>/dev/null && fail "malformed row launched"
[ ! -e "$LOGS" ] || fail "malformed row still launched something"
# 2. a duplicate row stops everything
reset; manifest "treatment${t}sdd-turn-liveness${t}1${t}p1${t}default\ntreatment${t}sdd-turn-liveness${t}1${t}p1${t}default\n"
bash "$script" "$tmp/manifest.tsv" 2>/dev/null && fail "duplicate row launched"
[ ! -e "$LOGS" ] || fail "duplicate row still launched something"
# 3. a row for another scenario stops everything
reset; manifest "treatment${t}sdd-turn-liveness${t}1${t}p1${t}default\nt1${t}other-scenario${t}1${t}p2${t}default\n"
bash "$script" "$tmp/manifest.tsv" 2>/dev/null && fail "other scenario launched"
[ ! -e "$LOGS" ] || fail "other scenario still launched something"
# 3b. control is not an arm of this campaign, which has one plugin under test
reset; manifest "control${t}sdd-turn-liveness${t}1${t}p1${t}default\n"
bash "$script" "$tmp/manifest.tsv" 2> "$tmp/err" && fail "control arm launched"
grep -qF "malformed arm 'control'" "$tmp/err" || fail "control arm message: $(cat "$tmp/err")"
[ ! -e "$LOGS" ] || fail "control arm still launched something"
# 3c. t1 runs the fork copy and nothing else; treatment and smoke run the base
# scenario and nothing else. Both halves of a mispaired row are legal on their
# own, so only the pair check refuses it.
reset; manifest "t1${t}sdd-turn-liveness${t}1${t}p1${t}default\n"
bash "$script" "$tmp/manifest.tsv" 2> "$tmp/err" && fail "t1 on the base scenario launched"
grep -qF "malformed pair 't1 sdd-turn-liveness'" "$tmp/err" || fail "t1 pair message: $(cat "$tmp/err")"
[ ! -e "$LOGS" ] || fail "t1 on the base scenario still launched something"
reset; manifest "treatment${t}sdd-turn-liveness-fork${t}1${t}p1${t}default\n"
bash "$script" "$tmp/manifest.tsv" 2> "$tmp/err" && fail "treatment on the fork copy launched"
grep -qF "malformed pair 'treatment sdd-turn-liveness-fork'" "$tmp/err" || fail "treatment pair message: $(cat "$tmp/err")"
[ ! -e "$LOGS" ] || fail "treatment on the fork copy still launched something"
# 4. an unknown pin key is malformed
reset; { pins; printf 'bogus\tx\n'; printf 'treatment\tsdd-turn-liveness\t1\tp1\tdefault\n'; } > "$tmp/manifest.tsv"
bash "$script" "$tmp/manifest.tsv" 2>/dev/null && fail "unknown pin key launched"
row="treatment${t}sdd-turn-liveness${t}1${t}p1${t}default\n"
# 4b. the previous campaign's control pins are unknown keys here
reset; { pins; printf 'control_root\tvalue\n'; printf '%b' "$row"; } > "$tmp/manifest.tsv"
bash "$script" "$tmp/manifest.tsv" 2>/dev/null && fail "control_root pin launched"
[ ! -e "$LOGS" ] || fail "control_root pin still launched something"
# 4c. a missing pin, a duplicated pin, a placeholder and a wrong codex pin each stop everything
reset; { pins | grep -v '^cc_path'; printf '%b' "$row"; } > "$tmp/manifest.tsv"
bash "$script" "$tmp/manifest.tsv" 2> "$tmp/err" && fail "missing pin launched"
grep -qF "missing pin cc_path" "$tmp/err" || fail "missing pin message: $(cat "$tmp/err")"
[ ! -e "$LOGS" ] || fail "missing pin still launched something"
reset; { pins; printf 'model\tvalue\n'; printf '%b' "$row"; } > "$tmp/manifest.tsv"
bash "$script" "$tmp/manifest.tsv" 2> "$tmp/err" && fail "duplicate pin launched"
grep -qF "duplicate pin model" "$tmp/err" || fail "duplicate pin message: $(cat "$tmp/err")"
[ ! -e "$LOGS" ] || fail "duplicate pin still launched something"
reset; { pins | sed 's/^cc\tvalue$/cc\t<fill me>/'; printf '%b' "$row"; } > "$tmp/manifest.tsv"
bash "$script" "$tmp/manifest.tsv" 2> "$tmp/err" && fail "placeholder pin launched"
grep -qF "pin cc is a placeholder" "$tmp/err" || fail "placeholder message: $(cat "$tmp/err")"
[ ! -e "$LOGS" ] || fail "placeholder pin still launched something"
reset; { pins | sed 's/^codex\tabsent$/codex\tpresent/'; printf '%b' "$row"; } > "$tmp/manifest.tsv"
bash "$script" "$tmp/manifest.tsv" 2> "$tmp/err" && fail "codex pin launched"
grep -qF "pin codex must be absent" "$tmp/err" || fail "codex message: $(cat "$tmp/err")"
[ ! -e "$LOGS" ] || fail "codex pin still launched something"
# 5. a non-zero child fails the closing status
reset; manifest "treatment${t}sdd-turn-liveness${t}1${t}p1${t}default\nt1${t}sdd-turn-liveness-fork${t}1${t}p2${t}default\n"
out="$tmp/out5"
STUB_FAIL=t1-sdd-turn-liveness-fork-p2 bash "$script" "$tmp/manifest.tsv" > "$out" 2>/dev/null && fail "failed child passed"
grep -qF "launchers non-zero: 1; manifest rows without a DONE log: 1" "$out" || fail "closing line misses the failure: $(tail -n 1 "$out")"
# 5b. p and r rows both launch
reset; manifest "treatment${t}sdd-turn-liveness${t}1${t}p1${t}default\ntreatment${t}sdd-turn-liveness${t}1${t}r1${t}default\n"
out="$tmp/out5b"
bash "$script" "$tmp/manifest.tsv" > "$out" 2>/dev/null || fail "p and r rows did not launch cleanly"
# 6. a clean manifest over all three arms and both scenarios ends with the clean closing line
reset; manifest "treatment${t}sdd-turn-liveness${t}1${t}p1${t}default\nsmoke${t}sdd-turn-liveness${t}1${t}p1${t}default\nt1${t}sdd-turn-liveness-fork${t}1${t}p1${t}default\n"
out="$tmp/out6"
bash "$script" "$tmp/manifest.tsv" > "$out" 2>/dev/null || fail "clean manifest failed"
[ "$(tail -n 1 "$out")" = "all launches finished; launchers non-zero: 0; manifest rows without a DONE log: 0" ] || fail "closing line: $(tail -n 1 "$out")"
# The tally reads the treatment arm's logs by name, and archive-runs.sh reads
# each arm's by its prefix, so the fork rows must land in their own log.
for log in treatment-sdd-turn-liveness-p1 smoke-sdd-turn-liveness-p1 t1-sdd-turn-liveness-fork-p1; do
  [ -f "$LOGS/$log.log" ] || fail "no log $log.log: $(ls "$LOGS")"
done
echo "PASS: launch-all.sh fails closed on a bad manifest and reports child failures"
echo "STATUS: PASSED"
