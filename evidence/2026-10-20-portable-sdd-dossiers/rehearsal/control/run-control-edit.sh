#!/usr/bin/env bash
# run-control-edit.sh PLUGIN_DIR: the Edit arm of the permission control.
# One session in the default permission mode and one with Write and Edit
# allowed are each asked to Write a file and then Edit it, under a plain-cache
# path and under a state-checkout path, with no other tool. Parity between the two paths,
# session by session, is the claim under test; the absolute outcome is not.
set -u
PLUGIN=${1:?plugin dir}
ROOT=/Users/johnss51/.cache/hyperpowers/portable-sdd-rehearsal/control-edit
rm -rf "$ROOT"
mkdir -p "$ROOT/config" "$ROOT/repo" "$ROOT/cache/hyperpowers/sdd/plainkey/plans/probe-11111111" "$ROOT/cache/hyperpowers/state/statekey/plans/probe-11111111"
git -C "$ROOT/cache/hyperpowers/state/statekey" init -q
git -C "$ROOT/repo" init -q
git -C "$ROOT/repo" -c user.name=c -c user.email=c@example.invalid commit -q --allow-empty -m init
PLAIN="$ROOT/cache/hyperpowers/sdd/plainkey/plans/probe-11111111/progress.md"
STATE="$ROOT/cache/hyperpowers/state/statekey/plans/probe-11111111/progress.md"
PROMPT="Use the Write and Edit tools, and nothing else. For each of two paths in turn, first $PLAIN and then $STATE: create the file with the Write tool containing the single line ok, then change that line to edited with the Edit tool. After each attempt print one line with the path, the tool, and whether it succeeded or was denied. Do not use Bash. Then stop."
run() { # <name> [claude args...]
  local name=$1; shift
  ( cd "$ROOT/repo" && env -u CLAUDECODE -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_SESSION_ID \
      -u CLAUDE_CODE_ENABLE_TODO_TOOLS -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN \
      -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_SESSION_ATTENDED -u CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS \
      CLAUDE_CONFIG_DIR="$ROOT/config" XDG_CACHE_HOME="$ROOT/cache" \
      timeout 600 claude -p "$PROMPT" --plugin-dir "$PLUGIN" --output-format stream-json --verbose \
        --max-budget-usd 3 --model claude-opus-5-5 "$@" < /dev/null > "$ROOT/$name.jsonl" 2> "$ROOT/$name.err"
    echo "$name exit=$?" >> "$ROOT/status.txt" )
  for f in "$PLAIN" "$STATE"; do
    key=$(basename "$(dirname "$(dirname "$(dirname "$f")")")")
    if [ -e "$f" ]; then w=written; else w=absent; fi
    if [ -e "$f" ] && [ "$(cat "$f")" = edited ]; then e=edited; else e=unedited; fi
    echo "$name $key $w $e" >> "$ROOT/outcomes.txt"
    rm -f "$f"
  done
}
run default-mode
run edit-allowed --allowedTools Write,Edit
cat "$ROOT/outcomes.txt"
