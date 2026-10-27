#!/usr/bin/env bash
# measure-launch.sh <arm> <scenario> <repeat> <proc> <budget>
# One quorum process for the sdd-stop-guard campaign, after checking the
# campaign pin in manifest.tsv (spec Design §4): the treatment root at its
# pinned commit with a clean tree, the evals harness paths identical to the
# harness pin and clean, ANTHROPIC_MODEL equal to the model pin, the claude on
# PATH at the cc and cc_path pins, the provider pin, and the task tools on.
# The campaign has one plugin under test, so every arm runs the one treatment
# root: an arm says what a launch is for (the counted runs, the smoke, the
# fork-mode T1), not which hyperpowers commit it loads; T1 alone runs the
# fork-mode copy of the scenario, and a mispaired arm and scenario is refused.
# Claims
# logs/<arm>-<scenario>-<proc>.log exclusively (a row is never relaunched into
# its old log), writes key=value header lines the tally reads, the exact
# command, quorum's output (its run-id lines), the root and Claude Code
# readings taken again after the run, and a last line DONE <code> when quorum
# exited 0, 1 or 2, else FAILED <code>. A refused launch writes
# preflight=<reason> and FAILED preflight; preflight=cc is the tally's restart
# signal. DISABLE_AUTOUPDATER=1 keeps a session from updating the shared
# Claude Code binary mid-campaign (the 2026-10-14 control saw one land).
# Test overrides: MANIFEST, LOGS, EVALS_DIR, QUORUM_RUN_CMD, CLAUDE_BIN.
set -uo pipefail
arm="$1"; scen="$2"; rep="$3"; proc="$4"; budget="$5"
E="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="${MANIFEST:-$E/manifest.tsv}"
LOGS="${LOGS:-$E/logs}"
EV="${EVALS_DIR:-$(cd "$E/../.." && pwd)}"
run_cmd="${QUORUM_RUN_CMD:-bun run quorum run}"
claude_bin="${CLAUDE_BIN:-claude}"
HARNESS_PATHS="src coding-agents package.json bun.lock bunfig.toml tsconfig.json container scripts/evals-container scenarios fixtures"
case "$arm" in treatment|smoke|t1) ;; *) echo "arm must be treatment, smoke or t1" >&2; exit 2 ;; esac
case "$scen" in sdd-turn-liveness|sdd-turn-liveness-fork) ;; *) echo "scenario must be sdd-turn-liveness or sdd-turn-liveness-fork" >&2; exit 2 ;; esac
# The launcher refuses a mispaired row before anything starts; this is the same
# rule at the one place a hand-run launch can still bypass it.
case "$arm-$scen" in
  treatment-sdd-turn-liveness|smoke-sdd-turn-liveness|t1-sdd-turn-liveness-fork) ;;
  *) echo "t1 runs sdd-turn-liveness-fork; treatment and smoke run sdd-turn-liveness" >&2; exit 2 ;;
esac
case "$proc" in p[0-9]|p[0-9][0-9]|r[0-9]|r[0-9][0-9]) ;; *) echo "proc must be p<n> or r<n>" >&2; exit 2 ;; esac
case "$rep" in [1-9]) ;; *) echo "repeat must be 1-9" >&2; exit 2 ;; esac
case "$budget" in default) ;; *) echo "budget must be default" >&2; exit 2 ;; esac
mkdir -p "$LOGS" || exit 1
log="$LOGS/$arm-$scen-$proc.log"
( set -C; echo "arm=$arm scenario=$scen repeat=$rep proc=$proc budget=$budget" > "$log" ) 2>/dev/null \
  || { echo "log exists or cannot be created: $log; add a new row instead" >&2; exit 1; }
refuse() {
  local reason="$1"; shift
  { echo "preflight=$reason"; echo "$*"; echo "FAILED preflight"; } >> "$log"
  echo "$*" >&2
  exit 1
}
pin() { awk -F '\t' -v key="$1" 'NF == 2 && $1 == key { print $2 }' "$MANIFEST"; }
for v in HTTP_PROXY HTTPS_PROXY NO_PROXY; do [ -n "${!v:-}" ] || refuse proxy "$v is not set in the launch environment"; done
root=$(pin treatment_root); root_pin=$(pin treatment); harness_pin=$(pin harness)
model_pin=$(pin model); cc_pin=$(pin cc); cc_path_pin=$(pin cc_path); provider_pin=$(pin provider); tools_pin=$(pin task_tools)
for x in "$root" "$root_pin" "$harness_pin" "$model_pin" "$cc_pin" "$cc_path_pin" "$provider_pin" "$tools_pin"; do
  case "$x" in ''|*'<'*) refuse manifest "manifest.tsv is not filled in" ;; esac
done
[ "${ANTHROPIC_MODEL:-}" = "$model_pin" ] || refuse model "ANTHROPIC_MODEL is '${ANTHROPIC_MODEL:-}', the pin is '$model_pin'"
{ [ "$tools_pin" = on ] && [ "${CLAUDE_CODE_ENABLE_TODO_TOOLS:-}" = 1 ]; } || refuse task_tools "task tools pin '$tools_pin', CLAUDE_CODE_ENABLE_TODO_TOOLS '${CLAUDE_CODE_ENABLE_TODO_TOOLS:-}'"
provider_now() {
  if [ "${CLAUDE_CODE_USE_VERTEX:-}" = 1 ] && [ "${CLAUDE_CODE_USE_BEDROCK:-}" != 1 ]; then echo vertex
  elif [ "${CLAUDE_CODE_USE_BEDROCK:-}" = 1 ] && [ "${CLAUDE_CODE_USE_VERTEX:-}" != 1 ]; then echo bedrock
  elif [ -n "${ANTHROPIC_API_KEY:-}" ]; then echo anthropic
  else echo none; fi
}
provider=$(provider_now)
[ "$provider" = "$provider_pin" ] || refuse provider "provider is '$provider', the pin is '$provider_pin'"
cc_path=$(command -v "$claude_bin") || refuse cc_path "no $claude_bin on PATH"
[ "$cc_path" = "$cc_path_pin" ] || refuse cc_path "claude resolves to '$cc_path', the pin is '$cc_path_pin'"
cc_now() { "$claude_bin" --version 2>/dev/null | awk 'NR == 1 { print $1 }'; }
cc_before=$(cc_now)
[ "$cc_before" = "$cc_pin" ] || refuse cc "claude is '$cc_before', the pin is '$cc_pin'"
root_state() {
  local head status
  head=$(git -C "$root" rev-parse HEAD) || return 1
  status=$(git -C "$root" status --short) || return 1
  if [ -z "$status" ]; then echo "$head yes"; else echo "$head no"; fi
}
state=$(root_state) || refuse root "git failed in $root"
root_head=${state% *}; root_clean=${state#* }
{ [ "$root_head" = "$root_pin" ] && [ "$root_clean" = yes ]; } || refuse root "the treatment root is at $root_head (clean: $root_clean), the pin is $root_pin"
cd "$EV" || refuse harness "cannot cd to $EV"
git cat-file -e "$harness_pin^{commit}" 2>/dev/null || refuse harness "harness pin $harness_pin does not resolve"
# shellcheck disable=SC2086
git diff --quiet "$harness_pin" HEAD -- $HARNESS_PATHS || refuse harness "harness paths differ from $harness_pin"
# shellcheck disable=SC2086
harness_status=$(git status --short -- $HARNESS_PATHS) || refuse harness "git status failed in $EV"
[ -z "$harness_status" ] || refuse harness "harness paths have uncommitted changes"
export SUPERPOWERS_ROOT="$root" DISABLE_AUTOUPDATER=1
{
  echo "root=$root root_head=$root_head root_clean=$root_clean"
  echo "harness_pin=$harness_pin evals_head=$(git rev-parse HEAD) harness_paths_identical=yes cc_path=$cc_path provider=$provider"
  echo "model=$ANTHROPIC_MODEL cc_before=$cc_before task_tools=$CLAUDE_CODE_ENABLE_TODO_TOOLS"
  echo "started=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "\$ $run_cmd scenarios/$scen --coding-agent claude-auto --repeat $rep"
  # shellcheck disable=SC2086
  $run_cmd "scenarios/$scen" --coding-agent claude-auto --repeat "$rep"
  code=$?
  after=$(root_state) || after="unknown unknown"
  echo "root_after_head=${after% *} root_after_clean=${after#* } cc_after=$(cc_now) finished=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  case "$code" in 0|1|2) echo "DONE $code" ;; *) echo "FAILED $code" ;; esac
} >> "$log" 2>&1
last=$(tail -n 1 "$log")
case "$last" in "DONE "*) exit 0 ;; *) exit 1 ;; esac
