#!/usr/bin/env bash
# run-trigger.sh ARM SCENARIO REP
# One live Claude Code print-mode session (plus a second turn when the
# scenario has one) against a fresh copy of the fixture, with the worktree
# loaded as the plugin and an empty config dir so no installed plugin or host
# CLAUDE.md is in play.
set -uo pipefail
ARM=$1; SCEN=$2; REP=$3
ROOT=/Users/johnss51/.cache/hyperpowers/communication-eval/trigger
PLUGIN=${PLUGIN_DIR:-/Users/johnss51/Development/agents/hyperpowers/.worktrees/communication-skill}
RUN=$ROOT/runs/$ARM/$SCEN-r$REP
rm -rf "$RUN"; mkdir -p "$RUN/config" "$RUN/work"
cp -R "$ROOT/fixtures/base/." "$RUN/work/"
cd "$RUN/work" || exit 1
git init -q && git add -A && git -c user.name=fixture -c user.email=fixture@example.com commit -qm "initial" || exit 1
printf '%s\n' "$PLUGIN" > "$RUN/plugin-dir.txt"

run_turn() {
  local n=$1 prompt_file=$2; shift 2
  env -u CLAUDECODE -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_SESSION_ID \
      -u CLAUDE_CODE_ENABLE_TODO_TOOLS -u CLAUDE_CODE_MESSAGING_SOCKET \
      -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_ENTRYPOINT \
      -u CLAUDE_CODE_SESSION_ATTENDED -u CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS \
      CLAUDE_CONFIG_DIR="$RUN/config" \
      PATH="/Users/johnss51/Applications/micromamba/envs/main/bin:$PATH" \
      timeout 1200 claude -p "$(cat "$prompt_file")" --plugin-dir "$PLUGIN" \
        --output-format stream-json --verbose --dangerously-skip-permissions \
        --max-budget-usd 8 --model "${TRIGGER_MODEL:-claude-opus-5-5}" "$@" < /dev/null > "$RUN/turn$n.jsonl" 2> "$RUN/turn$n.err"
  echo "turn$n exit=$?" >> "$RUN/status.txt"
}

run_turn 1 "$ROOT/prompts/$SCEN-1.txt"
if [ -f "$ROOT/prompts/$SCEN-2.txt" ]; then
  SID=$(/Users/johnss51/Applications/micromamba/envs/main/bin/python - "$RUN/turn1.jsonl" <<'PY'
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
    run_turn 2 "$ROOT/prompts/$SCEN-2.txt" --resume "$SID"
  else
    echo "turn2 skipped: no session id" >> "$RUN/status.txt"
  fi
fi
/Users/johnss51/Applications/micromamba/envs/main/bin/python "$ROOT/extract.py" "$RUN" > "$RUN/summary.txt"
cat "$RUN/summary.txt"
