#!/usr/bin/env bash
# measure-launch.test.sh
# Runs measure-launch.sh against stand-ins (a fake claude, a fake quorum, two
# throwaway git repos) so no real run starts, and checks the header tokens the
# tally reads and every preflight refusal.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
script="$here/measure-launch.sh"
fail() { echo "FAIL: $*" >&2; exit 1; }
tmp=$(mktemp -d "${TMPDIR:-/tmp}/measure-launch-test.XXXXXX") || fail "no temp directory"
trap 'rm -rf "$tmp"' EXIT
gitc() { git -c user.name=t -c user.email=t@example.com "$@"; }

root="$tmp/root"; evals="$tmp/evals"; export LOGS="$tmp/logs"
mkdir -p "$root" "$evals/src"
git -C "$root" init -q && : > "$root/f" && git -C "$root" add f && gitc -C "$root" commit -qm root
root_pin=$(git -C "$root" rev-parse HEAD)
git -C "$evals" init -q && : > "$evals/src/x" && git -C "$evals" add src/x && gitc -C "$evals" commit -qm evals
harness_pin=$(git -C "$evals" rev-parse HEAD)

export CLAUDE_BIN="$tmp/claude"
printf '#!/bin/sh\necho "2.1.300 (Claude Code)"\n' > "$CLAUDE_BIN"; chmod +x "$CLAUDE_BIN"
export QUORUM_RUN_CMD="$tmp/quorum"
printf '#!/bin/sh\nprintf '"'"'run-id: fake-1\\n'"'"'; exit 1\n' > "$QUORUM_RUN_CMD"; chmod +x "$QUORUM_RUN_CMD"

export MANIFEST="$tmp/manifest.tsv"
{
  printf 'harness\t%s\n' "$harness_pin"
  printf 'control\t%s\n' "$root_pin"
  printf 'treatment\t%s\n' "$root_pin"
  printf 'control_root\t%s\n' "$root"
  printf 'treatment_root\t%s\n' "$root"
  printf 'model\tclaude-opus-5-5\n'
  printf 'cc\t2.1.300\n'
  printf 'cc_path\t%s\n' "$CLAUDE_BIN"
  printf 'provider\tvertex\n'
  printf 'subagent_models\tclaude-opus-5-5,claude-sonnet-5-5,claude-haiku-5-5\n'
  printf 'codex\tabsent\n'
  printf 'task_tools\ton\n'
} > "$MANIFEST"

export EVALS_DIR="$evals" ANTHROPIC_MODEL=claude-opus-5-5 CLAUDE_CODE_ENABLE_TODO_TOOLS=1 CLAUDE_CODE_USE_VERTEX=1
export HTTP_PROXY=x HTTPS_PROXY=x NO_PROXY=x
unset CLAUDE_CODE_USE_BEDROCK ANTHROPIC_API_KEY

# 1. a clean launch writes the header tokens, the run id and DONE 1
bash "$script" control sdd-turn-liveness 1 p1 default || fail "clean launch exited non-zero"
log="$LOGS/control-sdd-turn-liveness-p1.log"
for needle in "root_head=$root_pin" "root_clean=yes" "cc_before=2.1.300" "cc_path=$CLAUDE_BIN" "provider=vertex" \
              "harness_pin=$harness_pin" "run-id: fake-1" "root_after_clean=yes" "cc_after=2.1.300"; do
  grep -qF -- "$needle" "$log" || fail "log lacks $needle"
done
[ "$(tail -n 1 "$log")" = "DONE 1" ] || fail "last line is not DONE 1"
# 2. a second launch of the same row refuses to overwrite its log
bash "$script" control sdd-turn-liveness 1 p1 default 2>/dev/null && fail "relaunch of p1 overwrote its log"
# 3. a model mismatch refuses, recording the reason
ANTHROPIC_MODEL=other bash "$script" control sdd-turn-liveness 1 p2 default 2>/dev/null && fail "model mismatch launched"
grep -qF "preflight=model" "$LOGS/control-sdd-turn-liveness-p2.log" || fail "p2 lacks preflight=model"
[ "$(tail -n 1 "$LOGS/control-sdd-turn-liveness-p2.log")" = "FAILED preflight" ] || fail "p2 last line"
# 4. a dirty root refuses
touch "$root/dirty"; bash "$script" control sdd-turn-liveness 1 p3 default 2>/dev/null && fail "dirty root launched"; rm "$root/dirty"
grep -qF "preflight=root" "$LOGS/control-sdd-turn-liveness-p3.log" || fail "p3 lacks preflight=root"
# 5. a Claude Code version off the pin refuses with preflight=cc (the tally's restart signal)
printf '#!/bin/sh\necho "2.1.299 (Claude Code)"\n' > "$CLAUDE_BIN"
bash "$script" control sdd-turn-liveness 1 p4 default 2>/dev/null && fail "cc mismatch launched"
grep -qF "preflight=cc" "$LOGS/control-sdd-turn-liveness-p4.log" || fail "p4 lacks preflight=cc"
printf '#!/bin/sh\necho "2.1.300 (Claude Code)"\n' > "$CLAUDE_BIN"
# 6. task tools off and a provider off the pin refuse
CLAUDE_CODE_ENABLE_TODO_TOOLS="" bash "$script" control sdd-turn-liveness 1 p5 default 2>/dev/null && fail "task tools off launched"
CLAUDE_CODE_USE_VERTEX="" ANTHROPIC_API_KEY=k bash "$script" control sdd-turn-liveness 1 p6 default 2>/dev/null && fail "provider mismatch launched"
grep -qF "preflight=provider" "$LOGS/control-sdd-turn-liveness-p6.log" || fail "p6 lacks preflight=provider"
# 7. a change under a harness path other than src/ refuses
(cd "$EVALS_DIR" && printf '{}\n' > tsconfig.json && git add tsconfig.json && git -c user.name=t -c user.email=t@example.com commit -qm tsconfig)
bash "$script" control sdd-turn-liveness 1 p7 default 2>/dev/null && fail "harness change launched"
grep -qF "preflight=harness" "$LOGS/control-sdd-turn-liveness-p7.log" || fail "p7 lacks preflight=harness"
echo "PASS: measure-launch.sh writes the tally's header tokens and refuses on every pin mismatch"
