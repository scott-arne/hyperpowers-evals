#!/usr/bin/env bash
# elicit-plan.sh <attempt>
# One headless Claude Code session that runs writing-plans (hyperpowers at the
# control root, v6.16.1) over a fresh copy of the fixture without plan.md, with
# an empty config dir so no installed plugin or host CLAUDE.md is in play.
# The session's stream-json output and stderr are transcript text, which no
# committed file may carry, so they go to $raw outside the repository; the
# committed attempt-<N>/ holds status.txt, turn.sha256 (to match the raw file
# later) and plan.md.
set -uo pipefail
attempt=$1
here="$(cd "$(dirname "$0")" && pwd)"
fixture="$(cd "$here/../../../fixtures/sdd-turn-liveness" && pwd)"
plugin=/Users/johnss51/.cache/hyperpowers/sdd-turn-liveness/hp-control
out="$here/attempt-$attempt"
raw="/Users/johnss51/.cache/hyperpowers/sdd-turn-liveness/elicitation/attempt-$attempt"
work="${TMPDIR:-/tmp}/sdd-turn-liveness-elicit-$attempt"
rm -rf "$work" "$out" "$raw"; mkdir -p "$work" "$out" "$raw/config"
cp -R "$fixture/design.md" "$fixture/tests" "$work/"
cd "$work" || exit 1
git init -q -b main && git add -A && git -c user.name=fixture -c user.email=fixture@example.com commit -qm initial || exit 1
env -u CLAUDECODE -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_SESSION_ID \
    -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_ENTRYPOINT \
    -u CLAUDE_CODE_SESSION_ATTENDED -u CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS \
    CLAUDE_CONFIG_DIR="$raw/config" \
    timeout 1800 claude -p "$(cat "$here/prompt.txt")" --plugin-dir "$plugin" \
      --output-format stream-json --verbose --dangerously-skip-permissions \
      --max-budget-usd 10 --model claude-opus-5-5 < /dev/null > "$raw/turn.jsonl" 2> "$raw/turn.err"
echo "exit=$?" > "$out/status.txt"
shasum -a 256 "$raw/turn.jsonl" | awk '{ print $1 }' > "$out/turn.sha256"
[ -f "$work/plan.md" ] && cp "$work/plan.md" "$out/plan.md"
rm -rf "$raw/config"
