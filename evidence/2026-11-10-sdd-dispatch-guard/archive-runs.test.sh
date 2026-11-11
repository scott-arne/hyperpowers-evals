#!/usr/bin/env bash
# archive-runs.sh against a synthetic results tree and a stub strip-runs.
set -u
E="$(cd "$(dirname "$0")" && pwd)"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
FAILURES=0
pass() { echo "  [PASS] $1"; }
fail() { echo "  [FAIL] $1"; FAILURES=$((FAILURES + 1)); }
EV="$T/evals"; id=sdd-dispatch-guard-claude-auto-20261111T100000Z-abcd
mkdir -p "$EV/scripts" "$EV/results/$id/gauntlet-agent/results/r1" "$T/logs"
printf '#!/usr/bin/env bash\nroot=""; run=""\nwhile [ $# -gt 0 ]; do case "$1" in --results-root) root=$2; shift 2 ;; --run) run=$2; shift 2 ;; *) shift ;; esac; done\nrm -rf "$root/workspaces/$run/home/.claude/.claude-env" "$root/workspaces/$run/home/.claude/sessions"\n' > "$EV/scripts/strip-runs"; chmod +x "$EV/scripts/strip-runs"
printf '{"gauntlet":{"status":"pass","summary":"s","reasoning":"r","run_id":"g1"},"error":null}' > "$EV/results/$id/verdict.json"; printf '{}' > "$EV/results/$id/gauntlet-agent/results/r1/result.json"
w="$EV/results/workspaces/$id"
mkdir -p "$w/coding-agent-workdir/.git" "$w/home/.claude/plugins/x" "$w/home/.claude/projects/-w" "$w/home/.claude/sessions" "$w/home/.cache/hyperpowers/dispatch-guard"
printf 'ref\n' > "$w/coding-agent-workdir/.git/HEAD"; printf '{}\n' > "$w/home/.claude/projects/-w/s.jsonl"; printf 'K=V\n' > "$w/home/.claude/.claude-env"
printf '{"decision":"deny"}\n' > "$w/home/.cache/hyperpowers/dispatch-guard/s.jsonl"
printf 'run-id: %s\ntrials: 1\n' "$id" > "$T/logs/treatment-1.log"
out=$(EVALS_DIR="$EV" LOGS="$T/logs" bash "$E/archive-runs.sh" treatment "$T/task" 2>&1); rc=$?
a="$T/task/treatment/workspaces/$id"
if [ "$rc" -eq 0 ] && [ -d "$a/coding-agent-workdir/git-dir" ] && [ ! -e "$a/coding-agent-workdir/.git" ] && [ ! -e "$a/home/.claude/plugins" ] && [ ! -e "$a/home/.claude/.claude-env" ] && [ -f "$a/home/.cache/hyperpowers/dispatch-guard/s.jsonl" ] && [ -f "$T/task/treatment/$id/verdict.json" ]; then pass "a run is archived with the hygiene applied and the guard log kept"; else fail "a run is archived with the hygiene applied and the guard log kept (rc=$rc: $out)"; fi
if [ -d "$w/coding-agent-workdir/.git" ] && [ -d "$w/home/.claude/plugins" ]; then pass "results/ is left as quorum wrote it"; else fail "results/ is left as quorum wrote it"; fi
out=$(EVALS_DIR="$EV" LOGS="$T/logs" bash "$E/archive-runs.sh" treatment "$T/task" 2>&1); rc=$?
if [ "$rc" -eq 0 ] && printf '%s' "$out" | grep -q "skip treatment $id (archived)"; then pass "an archived run is skipped"; else fail "an archived run is skipped (rc=$rc: $out)"; fi
sv=sdd-dispatch-guard-claude-auto-20261111T110000Z-ef01
mkdir -p "$EV/results/$sv"
printf '{"gauntlet":null,"error":{"stage":"setup"}}' > "$EV/results/$sv/verdict.json"; printf '{}' > "$EV/results/$sv/phase.json"; printf '{}' > "$EV/results/$sv/provenance.json"
printf 'run-id: %s\n' "$sv" > "$T/logs/treatment-2.log"
out=$(EVALS_DIR="$EV" LOGS="$T/logs" bash "$E/archive-runs.sh" treatment "$T/task" 2>&1); rc=$?
if [ "$rc" -eq 0 ] && [ -f "$T/task/treatment/$sv/phase.json" ] && [ ! -e "$T/task/treatment/workspaces/$sv" ]; then pass "a setup void with no workspace is archived and passes the check"; else fail "a setup void with no workspace is archived and passes the check (rc=$rc: $out)"; fi
printf 'run-id: missing-run\n' > "$T/logs/treatment-3.log"
out=$(EVALS_DIR="$EV" LOGS="$T/logs" bash "$E/archive-runs.sh" treatment "$T/task" 2>&1); rc=$?
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -q 'no verdict'; then pass "a named run without a verdict stops the script"; else fail "a named run without a verdict stops the script (rc=$rc: $out)"; fi
mkdir -p "$EV/results/escape"; printf '{}' > "$EV/results/escape/verdict.json"
printf 'run-id: ../escape\n' > "$T/logs/treatment-4.log"
out=$(EVALS_DIR="$EV" LOGS="$T/logs" bash "$E/archive-runs.sh" treatment "$T/task" 2>&1); rc=$?
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -q 'unsafe run id' && [ ! -e "$T/task/escape" ] && [ ! -e "$T/task/escape.partial" ]; then pass "a run id that is not one safe token stops the script before anything is copied"; else fail "a run id that is not one safe token stops the script before anything is copied (rc=$rc: $out)"; fi
# mk <id> <verdict-json> <gauntlet-agent files...>: a run with a transcript
# (unless NOTRANSCRIPT is set) and the named files under gauntlet-agent/ (a
# bare "dir" makes the directory only); expects a fresh LOGS directory per case.
mk() {
  local rid=$1 vj=$2; shift 2
  mkdir -p "$EV/results/$rid" "$T/logs-$rid"
  printf '%s' "$vj" > "$EV/results/$rid/verdict.json"
  for f in "$@"; do
    if [ "$f" = dir ]; then mkdir -p "$EV/results/$rid/gauntlet-agent"; else mkdir -p "$(dirname "$EV/results/$rid/gauntlet-agent/$f")"; printf '{}' > "$EV/results/$rid/gauntlet-agent/$f"; fi
  done
  mkdir -p "$EV/results/workspaces/$rid/home/.claude/projects/-w"
  [ -n "${NOTRANSCRIPT:-}" ] || printf '{}\n' > "$EV/results/workspaces/$rid/home/.claude/projects/-w/s.jsonl"
  printf 'run-id: %s\n' "$rid" > "$T/logs-$rid/treatment-1.log"
}
run_case() { EVALS_DIR="$EV" LOGS="$T/logs-$1" bash "$E/archive-runs.sh" treatment "$T/task2" 2>&1; }
COMPLETED='{"gauntlet":{"status":"pass","summary":"s","reasoning":"r","run_id":"g1"},"error":null}'
TRANSPORT='{"gauntlet":{"status":"error","run_id":null},"error":null}'
SETUP='{"gauntlet":null,"error":{"stage":"setup"}}'
mk c-noresult "$COMPLETED" dir
out=$(run_case c-noresult); rc=$?
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -q 'c-noresult'; then pass "a completed verdict whose run has no result.json fails the check"; else fail "a completed verdict whose run has no result.json fails the check (rc=$rc: $out)"; fi
NOTRANSCRIPT=1 mk s-agent "$SETUP" dir; printf '{}' > "$EV/results/s-agent/phase.json"; printf '{}' > "$EV/results/s-agent/provenance.json"
out=$(run_case s-agent); rc=$?
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -q 's-agent'; then pass "a setup-void verdict whose run has a gauntlet-agent directory fails the check"; else fail "a setup-void verdict whose run has a gauntlet-agent directory fails the check (rc=$rc: $out)"; fi
mk t-ok "$TRANSPORT" results/r1/run.jsonl
out=$(run_case t-ok); rc=$?
if [ "$rc" -eq 0 ]; then pass "a transport void with run.jsonl and a transcript passes the check"; else fail "a transport void with run.jsonl and a transcript passes the check (rc=$rc: $out)"; fi
mk t-result "$TRANSPORT" results/r1/run.jsonl results/r1/result.json
out=$(run_case t-result); rc=$?
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -q 't-result'; then pass "a transport void that has a result.json fails the check"; else fail "a transport void that has a result.json fails the check (rc=$rc: $out)"; fi
mk bad-json '{not json' results/r1/result.json
out=$(run_case bad-json); rc=$?
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -q 'bad-json'; then pass "an unparseable verdict.json fails the check"; else fail "an unparseable verdict.json fails the check (rc=$rc: $out)"; fi
echo ""
if [ "$FAILURES" -gt 0 ]; then echo "STATUS: FAILED ($FAILURES failures)"; exit 1; fi
echo "STATUS: PASSED"
