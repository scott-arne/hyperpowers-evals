#!/usr/bin/env bash
# check-rehearsal.sh PLUGIN_DIR: read the rehearsal outcomes; one line per check.
set -u
PLUGIN=${1:?plugin dir}
ROOT=/Users/johnss51/.cache/hyperpowers/portable-sdd-rehearsal
A="$ROOT/hostA/repo"; B="$ROOT/hostB/repo"
export XDG_CACHE_HOME="$ROOT/cache"
# Host P's own state key, so the permission probe cannot pass on another clone's ledger.
pkey=$( . "$PLUGIN/skills/subagent-driven-development/scripts/sdd-common.sh"; hp_key "$ROOT/hostP/repo" )
pledger=$(ls "$ROOT/cache/hyperpowers/state/$pkey/plans/"rehearsal-*/progress.md 2>/dev/null | head -n 1)
ok() { echo "  [PASS] $1"; }
bad() { echo "  [FAIL] $1"; fails=$((fails + 1)); }
fails=0
git -C "$A" log --oneline > "$ROOT/a.log"
grep -q 'first file' "$ROOT/a.log" && ok "A committed Task 1" || bad "A committed Task 1"
head -n 1 "$ROOT/handoff.txt" > "$ROOT/handoff-first.txt"
grep -q '^status=pushed' "$ROOT/handoff-first.txt" && ok "handoff pushed the state branch" || bad "handoff pushed the state branch ($(cat "$ROOT/handoff-first.txt"))"
grep -q 'sdd-state sync' "$ROOT/hostB-resume.jsonl" && ok "B ran sync" || bad "B ran sync"
grep -q 'sdd-state verify' "$ROOT/hostB-resume.jsonl" && ok "B ran verify" || bad "B ran verify"
grep -q 'task-1-brief' "$ROOT/hostB-resume.jsonl" && bad "B did not re-dispatch Task 1" || ok "B did not re-dispatch Task 1"
git -C "$B" log --oneline > "$ROOT/b.log"
grep -q 'second file' "$ROOT/b.log" && ok "B committed Task 2" || bad "B committed Task 2"
grep -q 'status=code-missing' "$ROOT/hostC-stale.jsonl" && ok "C saw code-missing" || bad "C saw code-missing"
grep -q 'task-2-brief' "$ROOT/hostC-stale.jsonl" && bad "C did not dispatch on a stale checkout" || ok "C did not dispatch on a stale checkout"
# Permission probe: how many tool denials name the state checkout versus the plain cache.
state_denied=$(grep -c 'permission' "$ROOT/hostP-accept.jsonl" 2>/dev/null | tr -d ' ')
grep -o '"[^"]*hyperpowers/state/[^"]*"' "$ROOT/hostP-accept.jsonl" | sort -u > "$ROOT/hostP-state-paths.txt"
echo "  [INFO] pass 0: $state_denied lines mention permission; state-checkout paths touched: $(wc -l < "$ROOT/hostP-state-paths.txt" | tr -d ' ')"
grep -q 'hostP-accept exit=0' "$ROOT/status.txt" && ok "pass 0's session ended normally" || bad "pass 0's session ended normally"
[ -n "$pledger" ] && grep -q 'Task 1: complete' "$pledger" && ok "pass 0 wrote Task 1's completion line in host P's own ledger in acceptEdits mode" || bad "pass 0 wrote Task 1's completion line in host P's own ledger in acceptEdits mode (ledger: ${pledger:-none})"
echo "rehearsal: $fails failed"
[ "$fails" -eq 0 ]
