#!/usr/bin/env bash
# Proves codex-focus-arm.sh against a stub companion, a stub codex binary and a
# stub Codex config: the focus check refuses altered focus files before any
# broker or review, each arm reviews every named fixture three times with its
# own focus text, the runtime record is written at both ends and a change
# between them fails the arm, a failed review keeps its exit status and still
# releases the broker and writes the end record, a config without one
# top-level model and effort line is refused, and an already-recorded broker
# is refused.
# Needs a hyperpowers checkout (arg 1) for verdict-normalize and for
# recipe-code.md at 5bef46c, and the focus directory (arg 2).
set -euo pipefail
root="${1:?hyperpowers root}"; focus="${2:?focus dir}"
here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/codex-focus-arm-test.XXXXXX")"
trap 'rm -rf "$work"' EXIT
fail() { echo "FAIL: $1"; exit 1; }
cap="$(cat "$focus/cap-sentence.txt")"
anchor="Naming, style, and speculative hardening are low. "

plugin="$work/plugin"
mkdir -p "$plugin/.claude-plugin" "$plugin/scripts/lib" "$work/bin" "$work/codex-home"
printf '{"name":"codex","version":"9.9.9-stub"}\n' > "$plugin/.claude-plugin/plugin.json"
cat > "$plugin/scripts/lib/broker-lifecycle.mjs" <<'EOF'
import { appendFileSync } from "node:fs";
const log = (line) => appendFileSync(process.env.STUB_LOG, `${line}\n`);
export function loadBrokerSession() {
  return process.env.STUB_EXISTING_BROKER ? { endpoint: "unix:/stub/existing" } : null;
}
export async function ensureBrokerSession(cwd) {
  log(`ensure ${cwd}`);
  return { endpoint: "unix:/stub/broker" };
}
export async function sendBrokerShutdown(endpoint) {
  log(`shutdown ${endpoint}`);
}
export function clearBrokerSession(cwd) {
  log(`clear ${cwd}`);
}
EOF
cat > "$plugin/scripts/codex-companion.mjs" <<'EOF'
import { appendFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const args = process.argv.slice(2);
const dir = process.env.STUB_FOCUS_DIR;
// Calls are numbered by their .txt files; the .head and .base sidecars below
// must not advance the count.
const call = readdirSync(dir).filter((f) => f.endsWith(".txt")).length + 1;
writeFileSync(`${dir}/${call}.txt`, args[args.indexOf("--json") + 1]);
// The arm runs the companion inside the reviewed repository, so the stub is
// an independent witness of the head it reviewed and the base it was given.
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
writeFileSync(`${dir}/${call}.head`, head);
writeFileSync(`${dir}/${call}.base`, args[args.indexOf("--base") + 1]);
appendFileSync(process.env.STUB_LOG, `review ${process.env.CODEX_COMPANION_APP_SERVER_ENDPOINT}\n`);
if (String(call) === process.env.STUB_COMPANION_FAIL) { console.error("stub: the turn failed"); process.exit(3); }
console.log(JSON.stringify({ review: "Adversarial Review", result: { verdict: "approve", summary: "stub", findings: [], next_steps: [] }, rawOutput: "", parseError: null }));
EOF
cat > "$work/bin/codex" <<'EOF'
#!/usr/bin/env bash
# A counter file makes each call report a newer version.
if [ -n "${STUB_CODEX_COUNTER:-}" ]; then
  n=$(( $(cat "$STUB_CODEX_COUNTER" 2>/dev/null || echo 0) + 1 ))
  echo "$n" > "$STUB_CODEX_COUNTER"
  echo "codex-cli 0.0.$n"
else
  echo "codex-cli 0.0.1"
fi
EOF
chmod +x "$work/bin/codex"
printf 'model = "stub-model"\nmodel_reasoning_effort = "low"\n\n[profiles.decoy]\nmodel = "decoy-model"\n' > "$work/codex-home/config.toml"

run_arm() { # <name> <focus-dir> <arm> <fixture>... ; leaves $work/<name>{,.log,.focus,.tmp,.stdout,.stderr}
  local name="$1" fdir="$2" arm="$3"; shift 3
  mkdir -p "$work/$name.focus" "$work/$name.tmp"
  : > "$work/$name.log"
  # Each arm gets its own TMPDIR, so what it leaves behind is checked without
  # counting anything another process put in the shared temp directory.
  TMPDIR="$work/$name.tmp" PATH="$work/bin:$PATH" CODEX_HOME="${STUB_HOME:-$work/codex-home}" STUB_LOG="$work/$name.log" STUB_FOCUS_DIR="$work/$name.focus" \
    bash "$here/codex-focus-arm.sh" "$root" "$plugin" "$fdir" "$arm" "$work/$name" "$@" \
    > "$work/$name.stdout" 2> "$work/$name.stderr"
}
count() { grep -c -- "$1" "$2" || true; }
# Captured provenance for one arm: for every fixture, .base equals the --base
# the stub received on each of its three calls, .head equals the HEAD the stub
# saw, .prompt equals the stub's recorded --json argument, and .diff is
# byte-identical to an independent two-commit build of the same fixture files
# (git diff output depends only on content).
check_captures() { # <name> <arm> <fixture>...
  local name="$1" arm="$2"; shift 2
  local k=0 fx i n indep b fixtures
  fixtures="$(cd "$here/.." && pwd)/fixtures/codex-focus-arm"
  indep="$(mktemp -d "${TMPDIR:-/tmp}/focus-arm-indep.XXXXXX")"
  for fx in "$@"; do
    [ -f "$work/$name/$fx-$arm.base" ] || fail "no .base for $fx ($arm)"
    [ -f "$work/$name/$fx-$arm.head" ] || fail "no .head for $fx ($arm)"
    [ -f "$work/$name/$fx-$arm.diff" ] || fail "no .diff for $fx ($arm)"
    for i in 1 2 3; do
      n=$((k * 3 + i))
      [ "$(cat "$work/$name.focus/$n.base")" = "$(cat "$work/$name/$fx-$arm.base")" ] || fail ".base for $fx ($arm) call $i must equal the --base the stub received"
      [ "$(cat "$work/$name.focus/$n.head")" = "$(cat "$work/$name/$fx-$arm.head")" ] || fail ".head for $fx ($arm) must equal the HEAD the stub saw on call $i"
      cmp -s "$work/$name.focus/$n.txt" "$work/$name/$fx-$arm-$i.prompt" || fail ".prompt for $fx ($arm) call $i must equal the stub's recorded --json argument"
    done
    mkdir -p "$indep/$fx"
    cp "$fixtures/$fx/"* "$indep/$fx/"
    git -C "$indep/$fx" init -q
    cp "$fixtures/$fx/lib.base.js" "$indep/$fx/lib.js"
    git -C "$indep/$fx" -c user.email=t@t -c user.name=t add -A
    git -C "$indep/$fx" -c user.email=t@t -c user.name=t commit -qm base
    b="$(git -C "$indep/$fx" rev-parse HEAD)"
    cp "$fixtures/$fx/lib.js" "$indep/$fx/lib.js"
    git -C "$indep/$fx" -c user.email=t@t -c user.name=t commit -qam head
    git -C "$indep/$fx" diff "$b" HEAD > "$indep/$fx.diff"
    cmp -s "$indep/$fx.diff" "$work/$name/$fx-$arm.diff" || fail ".diff for $fx ($arm) must be byte-identical to an independent base-to-head diff"
    k=$((k + 1))
  done
  rm -rf "$indep"
}

# Treatment on all six fixtures.
run_arm treat "$focus" treatment M H O P P2 Pc || fail "treatment arm exited $? ($(cat "$work/treat.stderr"))"
# Every per-fixture work directory (and the broker directory) the arm created
# in its own TMPDIR is gone when it exits.
[ "$(find "$work/treat.tmp" -mindepth 1 -maxdepth 1 | grep -c .)" -eq 0 ] || fail "the arm must remove its per-fixture work directories (left: $(find "$work/treat.tmp" -mindepth 1 -maxdepth 1 | tr '\n' ' '))"
[ "$(find "$work/treat" -name '*-treatment-*.json' | grep -c .)" -eq 18 ] || fail "treatment must leave 18 captures"
[ "$(count '"result":"approved"' "$work/treat.stdout")" -eq 18 ] || fail "every capture must normalize to approved"
for fx in M H O P P2 Pc; do for i in 1 2 3; do
  grep -q "^$fx treatment $i " "$work/treat.stdout" || fail "no normalize line for $fx treatment $i"
done; done
blob="$(git hash-object "$root/skills/requesting-code-review/scripts/verdict-normalize")"
expected="$(printf 'companion 9.9.9-stub\ncodex-binary %s\ncodex-version codex-cli 0.0.1\nmodel = "stub-model"\nmodel_reasoning_effort = "low"\nverdict-normalize %s' "$work/bin/codex" "$blob")"
[ "$(cat "$work/treat/runtime-start.txt")" = "$expected" ] || fail "runtime record: $(cat "$work/treat/runtime-start.txt")"
cmp -s "$work/treat/runtime-start.txt" "$work/treat/runtime-end.txt" || fail "start and end records must match"
[ "$(count '^ensure ' "$work/treat.log")" -eq 1 ] || fail "one broker per arm"
[ "$(count '^shutdown unix:/stub/broker$' "$work/treat.log")" -eq 1 ] || fail "the arm shuts down its own broker once"
[ "$(count '^clear ' "$work/treat.log")" -eq 1 ] || fail "the arm clears its broker record once"
[ "$(count '^review unix:/stub/broker$' "$work/treat.log")" -eq 18 ] || fail "every review goes through the arm's broker"
broker_dir="$(sed -n 's/^broker-dir //p' "$work/treat/broker.txt")"
grep -q "^ensure $broker_dir$" "$work/treat.log" || fail "the broker is keyed to the recorded directory"
[ ! -e "$broker_dir" ] || fail "the broker directory is removed on exit"
for f in "$work/treat.focus"/*.txt; do
  [ "$(grep -F -o -- "$cap" "$f" | grep -c .)" -eq 1 ] || fail "treatment focus must carry the cap sentence once: $f"
  # shellcheck disable=SC2016 # the literal placeholder
  ! grep -Fq -- '$1' "$f" || fail "treatment focus still holds a \$1 placeholder: $f"
  grep -Eq 'Review package: /.+/review\.diff\.' "$f" || fail "treatment focus must name the work directory's review.diff: $f"
done
check_captures treat treatment M H O P P2 Pc

# Control on one fixture: no cap, and the anchor runs straight into the next sentence.
run_arm ctl "$focus" control H || fail "control arm exited $? ($(cat "$work/ctl.stderr"))"
[ "$(find "$work/ctl" -name 'H-control-*.json' | grep -c .)" -eq 3 ] || fail "control must leave 3 captures"
for f in "$work/ctl.focus"/*.txt; do
  ! grep -Fq -- "$cap" "$f" || fail "control focus must not carry the cap sentence: $f"
  grep -Fq -- "${anchor}You are a stateless reviewer" "$f" || fail "control focus must be the 5bef46c text: $f"
done
check_captures ctl control H

# An altered cap in the treatment file fails before any broker or review.
cp -R "$focus" "$work/bad-treatment"
sed 's/is medium, unless/is low, unless/' "$focus/focus-treatment.txt" > "$work/bad-treatment/focus-treatment.txt"
if run_arm badt "$work/bad-treatment" treatment H; then fail "an altered treatment file must fail the arm"; fi
grep -q 'focus check' "$work/badt.stderr" || fail "the treatment refusal names the focus check"
[ ! -s "$work/badt.log" ] || fail "no broker or review before the focus check passes"

# A control file that no longer matches line 53 fails, even when the treatment
# file is changed to match it.
cp -R "$focus" "$work/bad-control"
sed 's/Do not edit anything\./Do not edit files./' "$focus/focus-control.txt" > "$work/bad-control/focus-control.txt"
sed 's/Do not edit anything\./Do not edit files./' "$focus/focus-treatment.txt" > "$work/bad-control/focus-treatment.txt"
if run_arm badc "$work/bad-control" control H; then fail "a control file that is not line 53 must fail the arm"; fi
grep -q 'not recipe-code.md line 53' "$work/badc.stderr" || fail "the control refusal names line 53"
[ ! -s "$work/badc.log" ] || fail "no broker or review before the focus check passes"

# A broker already recorded for the arm's directory is refused, never reused.
if STUB_EXISTING_BROKER=1 run_arm busy "$focus" control H; then fail "a recorded broker must stop the arm"; fi
grep -q 'already recorded' "$work/busy.stderr" || fail "the refusal names the recorded broker"
[ "$(count '^ensure ' "$work/busy.log")" -eq 0 ] || fail "a recorded broker must not be ensured"
[ "$(count '^shutdown ' "$work/busy.log")" -eq 0 ] || fail "a broker the arm did not start must not be shut down"
[ -z "$(find "$work/busy" -name '*.json')" ] || fail "no captures when the broker is refused"

# Unknown fixtures and arms are usage errors.
rc=0; run_arm unknown "$focus" control Z || rc=$?
[ "$rc" -eq 2 ] || fail "an unknown fixture must exit 2, got $rc"
rc=0; run_arm badarm "$focus" both H || rc=$?
[ "$rc" -eq 2 ] || fail "an unknown arm must exit 2, got $rc"

# A runtime change between the start and the end of an arm fails it.
if STUB_CODEX_COUNTER="$work/counter" run_arm drift "$focus" control M; then fail "a runtime change must fail the arm"; fi
grep -q 'runtime changed during the arm' "$work/drift.stderr" || fail "the drift failure names the runtime record"
! cmp -s "$work/drift/runtime-start.txt" "$work/drift/runtime-end.txt" || fail "drift records must differ"

# A review that fails mid-arm keeps its exit status, and the arm still releases
# its broker and writes an end record that matches the start.
rc=0; STUB_COMPANION_FAIL=2 run_arm crash "$focus" control M H || rc=$?
[ "$rc" -eq 3 ] || fail "a failed review must keep its exit status 3, got $rc"
[ "$(count '^M control ' "$work/crash.stdout")" -eq 1 ] || fail "the arm stops at the failed review"
[ -z "$(find "$work/crash" -name 'H-*')" ] || fail "no fixture after the failed review is reviewed"
cmp -s "$work/crash/runtime-start.txt" "$work/crash/runtime-end.txt" || fail "a failed arm still writes a matching end record"
[ "$(count '^shutdown unix:/stub/broker$' "$work/crash.log")" -eq 1 ] || fail "a failed arm shuts down its broker once"
[ "$(count '^clear ' "$work/crash.log")" -eq 1 ] || fail "a failed arm clears its broker record once"

# A Codex config without exactly one top-level model and effort line is
# refused before the broker starts, and leaves no runtime record.
mkdir -p "$work/no-effort" "$work/two-models"
printf 'model = "stub-model"\n' > "$work/no-effort/config.toml"
printf 'model = "a"\nmodel = "b"\nmodel_reasoning_effort = "low"\n' > "$work/two-models/config.toml"
for home in no-effort two-models; do
  rc=0; STUB_HOME="$work/$home" run_arm "$home" "$focus" control H || rc=$?
  [ "$rc" -eq 1 ] || fail "a $home config must exit 1, got $rc"
  grep -q 'model and model_reasoning_effort once each' "$work/$home.stderr" || fail "the $home refusal names the config rule"
  [ ! -s "$work/$home.log" ] || fail "no broker or review with a $home config"
  [ ! -e "$work/$home/runtime-start.txt" ] || fail "no runtime record from a $home config"
done

echo "PASS: codex-focus-arm checks its focus files and Codex config first, reviews each fixture three times per arm through one broker it owns, refuses a recorded broker, releases its broker and writes the end record on every exit, and fails on runtime drift, and records base, head, diff and prompt per review for both arms"
