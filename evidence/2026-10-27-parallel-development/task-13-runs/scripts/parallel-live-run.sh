#!/usr/bin/env bash
# Task 13 Step 2 (plan 2026-10-27-parallel-development): two live Claude Code
# sessions on one plan, each in print mode with its own fresh configuration and
# the candidate worktree as --plugin-dir. Session 2 starts once session 1's
# ledger shows `Task 1: branch`. The board is captured at three moments: both
# tasks claimed, the first merge-back, the final claim. Runs unsandboxed: a
# session's own sandbox cannot start inside an outer one (sandbox_apply EPERM).
set -u
L=/Users/johnss51/.cache/hyperpowers/parallel-live
R=$L/repo
CAND=$(cat "$L/candidate-path.txt")
PLAN=docs/hyperpowers/plans/2026-10-27-live.md
OUT=$L/run; mkdir -p "$OUT/timeline"
PROMPT="Execute $PLAN with subagent-driven-development; when asked, create a worktree."
log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$OUT/events.txt"; }

session() {
  local n=$1
  ( cd "$R" && env -u CLAUDECODE -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_SESSION_ID \
      -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_ENTRYPOINT \
      -u CLAUDE_CODE_SESSION_ATTENDED -u CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS \
      CLAUDE_CONFIG_DIR="$L/config-$n" \
      timeout 5400 claude -p "$PROMPT" --plugin-dir "$CAND" \
        --output-format stream-json --verbose --dangerously-skip-permissions \
        --max-budget-usd <cap> < /dev/null > "$OUT/s$n.jsonl" 2> "$OUT/s$n.err"
    echo "exit=$?" > "$OUT/s$n.exit" )
}

ledger() { ls "$HOME"/.cache/hyperpowers/state/*/plans/2026-10-27-live-*/progress.md "$HOME"/.cache/hyperpowers/sdd/*/plans/2026-10-27-live-*/progress.md 2>/dev/null | head -n 1; }
wsdir() { local l; l=$(ledger); [ -n "$l" ] && dirname "$l"; }
board() {
  ( cd "$R" && bash "$CAND/skills/subagent-driven-development/scripts/sdd-state" board "$PLAN" ) > "$OUT/board-$1.txt" 2>&1
  log "board $1 captured ($2)"
}
snap() {
  local l; l=$(ledger); [ -n "$l" ] || return 0
  if ! cmp -s "$l" "$OUT/timeline/last.md" 2>/dev/null; then
    cp "$l" "$OUT/timeline/last.md"; cp "$l" "$OUT/timeline/progress-$(date -u +%H%M%S).md"
  fi
}

log "session 1 start"
session 1 &
p1=$!
# Wait up to 30 minutes for session 1's Task 1 claim.
started2=0
for i in $(seq 1 360); do
  snap
  l=$(ledger)
  if [ -n "$l" ] && grep -q '^Task 1: branch ' "$l"; then log "session 1 claimed Task 1 (poll $i)"; break; fi
  kill -0 "$p1" 2>/dev/null || { log "session 1 exited before claiming Task 1"; break; }
  sleep 5
done
if kill -0 "$p1" 2>/dev/null; then
  log "session 2 start"; session 2 & started2=1
else
  log "session 2 not started: session 1 is not running"
fi

# Board moments, polled until both sessions end (at most 100 minutes).
b1=0; b2=0; b3=0
for i in $(seq 1 1200); do
  snap
  l=$(ledger); w=$(wsdir)
  if [ "$b1" -eq 0 ] && [ -n "$l" ] && grep -q '^Task 1: branch ' "$l" && grep -q '^Task 2: branch ' "$l"; then board 1 "both claimed"; b1=1; fi
  if [ "$b2" -eq 0 ] && [ -n "$l" ] && grep -qE '^Task [0-9]+: merged ' "$l"; then board 2 "first merge-back"; b2=1; fi
  if [ "$b3" -eq 0 ] && [ -n "$w" ] && { [ -d "$w/claims/task-final" ] || [ -d "$w/claims/final" ]; }; then board 3 "final claimed"; b3=1; fi
  if [ -z "$(jobs -rp)" ]; then log "both sessions ended (poll $i)"; break; fi
  sleep 5
done
[ -n "$(jobs -rp)" ] && log "poll bound reached with a session still running"
wait
log "after wait: s1 $(cat "$OUT/s1.exit" 2>/dev/null) s2 $(cat "$OUT/s2.exit" 2>/dev/null) started2=$started2 boards=$b1$b2$b3"
git -C "$R" log --graph --oneline --all > "$OUT/git-graph-all.txt" 2>&1
git -C "$R" worktree list > "$OUT/worktrees.txt" 2>&1
git -C "$R" branch -a > "$OUT/branches.txt" 2>&1
snap
log "done"
