#!/usr/bin/env bash
# run-sdd.sh RUN
# Rehearses the SDD path: one print-mode Claude Code session executes a
# one-task plan in a fixture with hyperpowers:subagent-driven-development and
# hands off to finishing, then a second turn answers the options menu with "3"
# and, when proposals stay open, a third answers them. The worktree is loaded
# as the plugin, the config dir holds only the claudeMdExcludes settings, and
# the Codex plugin registry points at a missing file so the Codex gates degrade.
# XDG_CACHE_HOME is per run, so the SDD workspace and review dirs are visible
# and cannot collide with the host's. The working copy and config dir live
# outside the evidence tree so the session's cwd has no CLAUDE.md or AGENTS.md
# above it.
# Environment: SUITE_SLEEP (suite seconds), PAD_LINES (length of the
# data/sample.txt the plan generates, default 5000; rewrites the plan's seq
# bound; every 5000 in the plan), EXCLUDE_ANCESTORS (default 1; 0 skips the claudeMdExcludes file),
# TURNS (default 3 when prompt-3.txt exists, else 2).
set -uo pipefail
RUN_NAME=$1
HERE=$(cd "$(dirname "$0")" && pwd)
PLUGIN=${PLUGIN_DIR:-/Users/johnss51/Development/agents/hyperpowers/.worktrees/decision-records}
PY=/Users/johnss51/Applications/micromamba/envs/main/bin/python
SCRATCH=/Users/johnss51/.cache/hyperpowers/decision-records-eval/task-14/$RUN_NAME
OUT=$HERE/$RUN_NAME
rm -rf "$SCRATCH" "$OUT"; mkdir -p "$SCRATCH/config" "$SCRATCH/work" "$SCRATCH/cache" "$OUT"
cp -R "$HERE/fixture/." "$SCRATCH/work/"
WORK=$SCRATCH/work
G=(git -C "$WORK" -c user.name=fixture -c user.email=fixture@example.com)
PAD=${PAD_LINES:-5000}
sed "s/5000/$PAD/g" "$WORK/docs/hyperpowers/plans/2026-10-20-count.md" > "$SCRATCH/plan.md" || exit 1

"${G[@]}" init -q -b main || exit 1
rm "$WORK/docs/hyperpowers/plans/2026-10-20-count.md" && "${G[@]}" add -A || exit 1
"${G[@]}" commit -qm "initial: notes cli, tests, count spec" || exit 1
"${G[@]}" checkout -q -b feature/count || exit 1
cp "$SCRATCH/plan.md" "$WORK/docs/hyperpowers/plans/2026-10-20-count.md" && "${G[@]}" add -f docs/hyperpowers/plans/2026-10-20-count.md || exit 1
"${G[@]}" commit -qm "docs: count plan" || exit 1
printf '%s\n' "$PLUGIN" > "$SCRATCH/plugin-dir.txt"

# Exclude every ancestor's instruction files, as quorum does
# (evals/src/agents/index.ts ancestorClaudeMdExcludes), so the host user-level
# CLAUDE.md stays out. The work dir itself is not excluded.
excludes=""
if [ "${EXCLUDE_ANCESTORS:-1}" = 1 ]; then
dir=$(dirname "$WORK")
while :; do
  for glob in CLAUDE.md CLAUDE.local.md .claude/CLAUDE.md '.claude/rules/**' AGENTS.md .claude/AGENTS.md; do
    excludes="$excludes\"${dir%/}/$glob\","
  done
  parent=$(dirname "$dir")
  [ "$parent" = "$dir" ] && break
  dir=$parent
done
printf '{"claudeMdExcludes":[%s]}\n' "${excludes%,}" > "$SCRATCH/config/settings.json"
fi

run_turn() {
  local n=$1 prompt_file=$2; shift 2
  (cd "$WORK" && env -u CLAUDECODE -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_SESSION_ID \
      -u CLAUDE_CODE_ENABLE_TODO_TOOLS -u CLAUDE_CODE_MESSAGING_SOCKET \
      -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_ENTRYPOINT \
      -u CLAUDE_CODE_SESSION_ATTENDED -u CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS \
      CLAUDE_CONFIG_DIR="$SCRATCH/config" \
      XDG_CACHE_HOME="$SCRATCH/cache" \
      HYPERPOWERS_PLUGINS_FILE=/nonexistent \
      SUITE_SLEEP="${SUITE_SLEEP:-0}" \
      PATH="/Users/johnss51/Applications/micromamba/envs/main/bin:$PATH" \
      timeout 3600 claude -p "$(cat "$prompt_file")" --plugin-dir "$PLUGIN" \
        --output-format stream-json --verbose --dangerously-skip-permissions \
        --max-budget-usd 20 --model "${TRIGGER_MODEL:-claude-opus-5-5}" "$@" < /dev/null > "$OUT/turn$n.jsonl" 2> "$OUT/turn$n.err")
  echo "turn$n exit=$?" >> "$OUT/status.txt"
}

snapshot() {
  {
    echo "== staged (diff --cached --name-status)"
    git -C "$WORK" diff --cached --name-status
    echo "== log (-8, %h %cI %s)"
    git -C "$WORK" log --format='%h %cI %s' -8
    echo "== status --porcelain"
    git -C "$WORK" status --porcelain
    echo "== branch"
    git -C "$WORK" branch --show-current
    echo "== plan present?"
    if [ -e "$WORK/docs/hyperpowers/plans/2026-10-20-count.md" ]; then echo yes; else echo no; fi
    echo "== sample.txt lines"
    if [ -e "$WORK/data/sample.txt" ]; then wc -l < "$WORK/data/sample.txt"; else echo absent; fi
    echo "== ls \$SCRATCH/cache/hyperpowers/sdd"
    ls "$SCRATCH/cache/hyperpowers/sdd" 2>&1
    echo "== commit body (git show -s --format=%B HEAD)"
    git -C "$WORK" show -s --format=%B HEAD
  } > "$OUT/fixture-state-$1.txt" 2>&1
}

TURNS=${TURNS:-3}
[ -f "$HERE/prompt-3.txt" ] || TURNS=2
echo "config: SUITE_SLEEP=${SUITE_SLEEP:-0} PAD_LINES=$PAD EXCLUDE_ANCESTORS=${EXCLUDE_ANCESTORS:-1} TURNS=$TURNS XDG_CACHE_HOME=\$SCRATCH/cache HYPERPOWERS_PLUGINS_FILE=/nonexistent model=${TRIGGER_MODEL:-claude-opus-5-5} plugin=$PLUGIN" > "$OUT/status.txt"
run_turn 1 "$HERE/prompt-1.txt"
snapshot 1
SID=$("$PY" - "$OUT/turn1.jsonl" <<'PY'
import json, sys
for line in open(sys.argv[1]):
    try:
        d = json.loads(line)
    except Exception:
        continue
    if d.get("session_id"):
        print(d["session_id"]); break
PY
)
if [ -n "$SID" ]; then
  date -u +%Y-%m-%dT%H:%M:%SZ > "$OUT/turn2-start.txt"
  run_turn 2 "$HERE/prompt-2.txt" --resume "$SID"
  snapshot 2
  # The third turn answers proposals turn 2 left open; skip it when turn 2
  # already committed the records.
  if [ "$TURNS" -ge 3 ] && ! git -C "$WORK" log -1 --format=%s | grep -q '^docs: record decisions for'; then
    date -u +%Y-%m-%dT%H:%M:%SZ > "$OUT/turn3-start.txt"
    run_turn 3 "$HERE/prompt-3.txt" --resume "$SID"
    snapshot 3
  fi
else
  echo "turn2 skipped: no session id" >> "$OUT/status.txt"
fi
