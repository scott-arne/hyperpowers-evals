#!/usr/bin/env bash
# run-finishing.sh RUN
# Rehearses the finishing path: one print-mode Claude Code session against a
# fixture feature branch (spec with two decisions, plan, implementation), then
# a second turn answering the options menu with "3". The worktree is loaded as
# the plugin and the config dir is empty, so no installed plugin or host
# CLAUDE.md is in play. SUITE_SLEEP in the environment sets how long the
# fixture's test suite runs. The working copy and config dir live outside the
# evidence tree so the session's cwd has no CLAUDE.md or AGENTS.md above it.
set -uo pipefail
RUN_NAME=$1
HERE=$(cd "$(dirname "$0")" && pwd)
PLUGIN=${PLUGIN_DIR:-/Users/johnss51/Development/agents/hyperpowers/.worktrees/decision-records}
PY=/Users/johnss51/Applications/micromamba/envs/main/bin/python
SCRATCH=/Users/johnss51/.cache/hyperpowers/decision-records-eval/task-13/$RUN_NAME
OUT=$HERE/$RUN_NAME
rm -rf "$SCRATCH" "$OUT"; mkdir -p "$SCRATCH/config" "$SCRATCH/work" "$OUT"
cp -R "$HERE/fixture/." "$SCRATCH/work/"
WORK=$SCRATCH/work
G=(git -C "$WORK" -c user.name=fixture -c user.email=fixture@example.com)

"${G[@]}" init -q -b main || exit 1
mv "$WORK/docs/hyperpowers/plans/2026-10-20-tags.md" "$SCRATCH/plan.md" && "${G[@]}" add -A || exit 1
"${G[@]}" commit -qm "initial: notes cli, tests, tags spec" || exit 1
"${G[@]}" checkout -q -b feature/tags || exit 1
mv "$SCRATCH/plan.md" "$WORK/docs/hyperpowers/plans/2026-10-20-tags.md" && "${G[@]}" add -f docs/hyperpowers/plans/2026-10-20-tags.md || exit 1
"${G[@]}" commit -qm "docs: tags plan" || exit 1

cat > "$WORK/notes.sh" <<'EOF'
#!/usr/bin/env bash
# notes.sh add TEXT | list [--tag TAG] : a tiny notes CLI backed by notes.txt.
# Tags are a #tag suffix on the note line; filtering happens here, not in a library.
set -euo pipefail
FILE="${NOTES_FILE:-notes.txt}"
case "${1:-}" in
  add) shift; printf '%s\n' "$*" >> "$FILE" ;;
  list)
    [ -f "$FILE" ] || exit 0
    if [ "${2:-}" = "--tag" ]; then
      grep -E -- "#${3:?tag required}\$" "$FILE" || true
    else
      cat "$FILE"
    fi
    ;;
  *) echo "usage: notes.sh add TEXT | list [--tag TAG]" >&2; exit 64 ;;
esac
EOF
cat > "$WORK/test.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
NOTES_FILE="$(mktemp)"
export NOTES_FILE
bash notes.sh add "first note"
bash notes.sh add "second note #home"
[ "$(bash notes.sh list | wc -l | tr -d ' ')" = "2" ] || { echo "expected two lines" >&2; exit 1; }
[ "$(bash notes.sh list --tag home | wc -l | tr -d ' ')" = "1" ] || { echo "expected one tagged line" >&2; exit 1; }
sleep "${SUITE_SLEEP:-0}"
echo "ok"
exit 0
EOF
# PAD_LINES > 0 makes the merge-base diff large so the extractor outlasts an
# instant suite.
if [ "${PAD_LINES:-0}" -gt 0 ]; then
  mkdir -p "$WORK/data"
  seq 1 "$PAD_LINES" > "$WORK/data/sample.txt"
fi
"${G[@]}" add -A || exit 1
"${G[@]}" commit -qm "feat: tag notes with a #tag suffix and filter with list --tag" || exit 1
printf '%s\n' "$PLUGIN" > "$SCRATCH/plugin-dir.txt"

# Exclude every ancestor's instruction files, as quorum does
# (evals/src/agents/index.ts ancestorClaudeMdExcludes), so the host user-level
# CLAUDE.md stays out. The work dir itself is not excluded.
excludes=""
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

run_turn() {
  local n=$1 prompt_file=$2; shift 2
  (cd "$WORK" && env -u CLAUDECODE -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_SESSION_ID \
      -u CLAUDE_CODE_ENABLE_TODO_TOOLS -u CLAUDE_CODE_MESSAGING_SOCKET \
      -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_ENTRYPOINT \
      -u CLAUDE_CODE_SESSION_ATTENDED -u CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS \
      CLAUDE_CONFIG_DIR="$SCRATCH/config" \
      SUITE_SLEEP="${SUITE_SLEEP:-0}" \
      PATH="/Users/johnss51/Applications/micromamba/envs/main/bin:$PATH" \
      timeout 1200 claude -p "$(cat "$prompt_file")" --plugin-dir "$PLUGIN" \
        --output-format stream-json --verbose --dangerously-skip-permissions \
        --max-budget-usd 8 --model "${TRIGGER_MODEL:-claude-opus-5-5}" "$@" < /dev/null > "$OUT/turn$n.jsonl" 2> "$OUT/turn$n.err")
  echo "turn$n exit=$?" >> "$OUT/status.txt"
}

snapshot() {
  {
    echo "== staged (diff --cached --name-status)"
    git -C "$WORK" diff --cached --name-status
    echo "== log (-5, %h %cI %s)"
    git -C "$WORK" log --format='%h %cI %s' -5
    echo "== status --porcelain"
    git -C "$WORK" status --porcelain
    echo "== branch"
    git -C "$WORK" branch --show-current
    echo "== plan present?"
    if [ -e "$WORK/docs/hyperpowers/plans/2026-10-20-tags.md" ]; then echo yes; else echo no; fi
  } > "$OUT/fixture-state-$1.txt" 2>&1
}

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
else
  echo "turn2 skipped: no session id" >> "$OUT/status.txt"
fi
