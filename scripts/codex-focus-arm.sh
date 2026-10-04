#!/usr/bin/env bash
# codex-focus-arm.sh <hyperpowers-root> <codex-plugin-root> <focus-dir> <control|treatment> <out-dir> <fixture>...
# Reviews each named fixture with real Codex three times under one arm's focus
# text and normalizes every capture with hyperpowers' verdict-normalize.
# <focus-dir> holds focus-control.txt, focus-treatment.txt and cap-sentence.txt.
# The arm's file is the recipe focus, composed after the correctness-lens
# skeleton. Before any review the script proves that the treatment file is the
# control file plus the cap sentence, and that the control file is
# recipe-code.md line 53 at 5bef46c with its four path placeholders filled in.
# Each fixture becomes a two-commit git repo: base = checked-in lib.base.js,
# head = the fixture's lib.js. Asserts both parse and pass tests before reviewing.
# The companion version, the codex binary and version, the configured model and
# reasoning effort, and the verdict-normalize blob are recorded before the
# broker starts and again on every exit after that; the arm fails if the two
# records differ, and a failed arm keeps its own exit status.
# Runs are sequential and blocking; launch this script with the shell tool's
# background option and watch its log, never a bare foreground call a harness
# timeout can kill mid-review.
#
# Round 3 change: uses checked-in lib.base.js instead of filtering (round 2's
# filter left lines after trim, producing broken bases). Asserts both revisions
# parse and test before reviewing.
set -euo pipefail
root="${1:?hyperpowers root}"; codex="${2:?codex-plugin-cc root}"; focus_dir="${3:?focus dir}"; arm="${4:?control|treatment}"; out="${5:?out dir}"
shift 5
here="$(cd "$(dirname "$0")/.." && pwd)"

case "$arm" in
  control|treatment) ;;
  *) echo "arm must be control or treatment, got: $arm" >&2; exit 2 ;;
esac
[ "$#" -gt 0 ] || { echo "name at least one fixture" >&2; exit 2; }

# The head commit's message, as the 09-05 rounds used for M, H and O.
commit_message() {
  case "$1" in
    M|H|O) printf '%s' "accept percent strings" ;;
    P|P2) printf '%s' "report and count workspaces" ;;
    Pc) printf '%s' "mark every workspace paused or resumed" ;;
    *) echo "no commit message for fixture: $1" >&2; return 1 ;;
  esac
}
for fx in "$@"; do
  commit_message "$fx" >/dev/null || exit 2
  [ -f "$here/fixtures/codex-focus-arm/$fx/lib.base.js" ] || { echo "no fixture at fixtures/codex-focus-arm/$fx" >&2; exit 2; }
done

# shellcheck disable=SC2016 # node source, not shell
node --input-type=module -e '
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const [root, dir] = process.argv.slice(1);
const fail = (why) => { console.error(`focus check: ${why}`); process.exit(1); };
const control = readFileSync(`${dir}/focus-control.txt`, "utf8");
const treatment = readFileSync(`${dir}/focus-treatment.txt`, "utf8");
const cap = readFileSync(`${dir}/cap-sentence.txt`, "utf8").replace(/\n$/, "");
const anchor = "Naming, style, and speculative hardening are low. ";
const capped = `${anchor}${cap} `;
if (control.split(anchor).length !== 2) fail("the control file must carry the calibration anchor exactly once");
if (treatment.split(capped).length !== 2) fail("the treatment file must carry the cap sentence once, right after the anchor");
if (treatment.replace(capped, () => anchor) !== control) fail("the treatment file without the cap sentence is not the control file");
const line = execFileSync("git", ["-C", root, "show", "5bef46c:skills/requesting-code-review/recipe-code.md"], { encoding: "utf8" }).split("\n")[52];
const start = line.indexOf("--json \"");
if (start < 0 || !line.endsWith("\"")) fail("recipe-code.md line 53 at 5bef46c is not a --json launch");
const reversed = control
  .replace("Requirements: $1/REQUIREMENTS.md.", () => "Requirements: <TASK_BRIEF_PATH>.")
  .replace("Implementer report: $1/REQUIREMENTS.md.", () => "Implementer report: <IMPLEMENTER_REPORT_PATH>.")
  .replace("Review package: $1/review.diff.", () => "Review package: <REVIEW_PACKAGE_PATH>.")
  .replace("Global constraints: $1/REQUIREMENTS.md.", () => "Global constraints: <GLOBAL_CONSTRAINTS_PATH>.");
if (reversed !== line.slice(start + 8, -1)) fail("the control file is not recipe-code.md line 53 at 5bef46c");
' "$root" "$focus_dir"
recipe_template="$(cat "$focus_dir/focus-$arm.txt")"

mkdir -p "$out"
# Each step returns on failure itself: the finish trap calls this in a
# condition, where set -e does not apply.
runtime_record() {
  local companion binary version settings normalizer
  companion="$(node -p 'require(process.argv[1]).version' "$codex/.claude-plugin/plugin.json")" || return 1
  binary="$(command -v codex)" || return 1
  version="$(codex --version)" || return 1
  # Top-level keys only: a profile section can carry its own model line.
  settings="$(awk '
    /^\[/ { exit }
    /^(model|model_reasoning_effort)[[:space:]]*=/ { print; key = $0; sub(/[[:space:]]*=.*/, "", key); seen[key]++ }
    END {
      if (seen["model"] != 1 || seen["model_reasoning_effort"] != 1) {
        print "the Codex config must set model and model_reasoning_effort once each at the top level" > "/dev/stderr"
        exit 1
      }
    }' "${CODEX_HOME:-$HOME/.codex}/config.toml")" || return 1
  normalizer="$(git hash-object "$root/skills/requesting-code-review/scripts/verdict-normalize")" || return 1
  printf 'companion %s\ncodex-binary %s\ncodex-version %s\n%s\nverdict-normalize %s\n' "$companion" "$binary" "$version" "$settings" "$normalizer"
}
if ! runtime_record > "$out/runtime-start.txt"; then
  rm -f "$out/runtime-start.txt"
  echo "cannot write the runtime record; no review ran" >&2
  exit 1
fi

# From here every exit releases the broker if one was started and writes the
# end record, so a failed arm still leaves both records for the audit.
broker_dir=""
broker_endpoint=""
finish() {
  local rc=$?
  if [ -n "$broker_endpoint" ]; then
    # shellcheck disable=SC2016 # node source, not shell
    node --input-type=module -e '
const [lib, endpoint, dir] = process.argv.slice(1);
const { sendBrokerShutdown, clearBrokerSession } = await import(lib);
await sendBrokerShutdown(endpoint);
clearBrokerSession(dir);
' "$codex/scripts/lib/broker-lifecycle.mjs" "$broker_endpoint" "$broker_dir" || echo "warning: could not release the broker at $broker_endpoint" >&2
  fi
  [ -z "$broker_dir" ] || rm -rf "$broker_dir"
  if ! runtime_record > "$out/runtime-end.txt"; then
    echo "cannot write $out/runtime-end.txt" >&2
    [ "$rc" -ne 0 ] || rc=1
  elif ! cmp -s "$out/runtime-start.txt" "$out/runtime-end.txt"; then
    echo "runtime changed during the arm; see $out/runtime-start.txt and $out/runtime-end.txt" >&2
    [ "$rc" -ne 0 ] || rc=1
  fi
  exit "$rc"
}
trap finish EXIT

# One broker for the whole arm, released when the script exits. The companion
# otherwise starts a broker per workspace root, and every fixture below runs in
# its own temporary directory: a 3x3 arm left 26 brokers alive, holding their
# sockets after the temp copies were gone, because no SessionEnd hook fires for
# a script. Pointing every review at one endpoint removes the per-fixture
# broker entirely.
# The broker is keyed to a fresh directory, not this checkout: a Claude
# session's own Codex review run from the evals checkout keeps its broker
# recorded until that session ends, and an arm must neither review through nor
# shut down a broker it did not start.
broker_dir="$(mktemp -d "${TMPDIR:-/tmp}/focus-arm-broker.XXXXXX")"
# shellcheck disable=SC2016 # node source, not shell
broker_endpoint="$(node --input-type=module -e '
const [lib, dir] = process.argv.slice(1);
const { loadBrokerSession, ensureBrokerSession } = await import(lib);
if (loadBrokerSession(dir)) { console.error(`a broker is already recorded for ${dir}`); process.exit(1); }
const session = await ensureBrokerSession(dir);
if (!session || !session.endpoint) { console.error("no broker endpoint"); process.exit(1); }
console.log(session.endpoint);
' "$codex/scripts/lib/broker-lifecycle.mjs" "$broker_dir")"
export CODEX_COMPANION_APP_SERVER_ENDPOINT="$broker_endpoint"
printf 'broker-dir %s\nendpoint %s\n' "$broker_dir" "$broker_endpoint" > "$out/broker.txt"

# Lens skeleton for correctness lens (task/adhoc gate, round 1)
lens_skeleton() {
  cat <<'EOF'
Read the review dossier first — it is your delivered context: $1/review.diff
Where a dossier section says NOT PROVIDED, answer that Coverage axis exactly `cannot-verify: <reason>` — never `not applicable`; where it says NOT APPLICABLE, answer it `not applicable: <why>` without hedging.
Your lens for this review: Does the change do what its requirements say, and only that; logic, edge cases, failure paths.
Report every blocking finding you can identify this round; do not reserve findings for later rounds.
Findings outside your lens are still reported, labeled [out-of-lane] — never suppressed.
You are a stateless reviewer for this request only; do not load or read skill bootstraps or skills.
Do not edit anything. Return exactly the structured JSON output format required for code reviews, adding a Coverage: section inside the summary field with these axes (each answered concretely or marked not applicable): documents read (review.diff); adjudicated decisions considered (none); changed surfaces reviewed (from review.diff); test evidence inspected (from REQUIREMENTS.md).

EOF
}

for fx in "$@"; do
  work="$(mktemp -d "${TMPDIR:-/tmp}/focus-arm-$fx.XXXXXX")"
  cp "$here/fixtures/codex-focus-arm/$fx/"* "$work/"
  git -C "$work" init -q

  # Base: checked-in lib.base.js
  cp "$here/fixtures/codex-focus-arm/$fx/lib.base.js" "$work/lib.js"

  # Assert base parses and tests pass
  node --check "$work/lib.js"
  ( cd "$work" && node test.js > /dev/null )

  git -C "$work" -c user.email=t@t -c user.name=t add -A && git -C "$work" -c user.email=t@t -c user.name=t commit -qm base
  base="$(git -C "$work" rev-parse HEAD)"

  # Head: fixture's lib.js
  cp "$here/fixtures/codex-focus-arm/$fx/lib.js" "$work/lib.js"

  # Assert head parses and tests pass
  node --check "$work/lib.js"
  ( cd "$work" && node test.js > /dev/null )

  git -C "$work" -c user.email=t@t -c user.name=t commit -qam "$(commit_message "$fx")"
  git -C "$work" diff "$base" HEAD > "$work/review.diff"

  for i in 1 2 3; do
    # Compose production round-1 focus: lens skeleton + recipe focus
    skeleton="$(lens_skeleton | sed "s|\\\$1|$work|g")"
    recipe="$(printf '%s' "$recipe_template" | sed "s|\\\$1|$work|g")"
    focus="$skeleton$recipe"

    cap="$out/$fx-$arm-$i.json"
    ( cd "$work" && node "$codex/scripts/codex-companion.mjs" adversarial-review --base "$base" --json "$focus" ) > "$cap" 2>"$cap.err"
    printf '%s %s %s ' "$fx" "$arm" "$i"; bash "$root/skills/requesting-code-review/scripts/verdict-normalize" "$cap"
  done
done
