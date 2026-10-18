#!/usr/bin/env bash
# Proves launch-all.sh runs the paired control as a sequential, alternating
# state machine (B p1, N p1, B p2, N p2, ...): every launch's exit status kept,
# a failure counted as a trial, a grader-exit void replaced in place and capped
# at three per arm, a baseline setup void relaunched without touching that cap,
# a new-arm setup or QA-agent misconfiguration an immediate stop, and a launch
# with no run-id a stop. Each case scripts the kind every launch returns through
# fake-quorum.sh, and the launcher classifies it with the real tally.py. The
# launcher runs under /bin/bash, 3.2 on this host, the only bash it has.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd -P)"
launcher="$here/launch-all.sh"
scenario=cost-api-field-rename-boundary
# The cases expect the launcher's defaults except where run_case sets a value.
unset SCENARIO OUT_DIR TALLY QUORUM_RUN_CMD FAKE_SCRIPT
work="$(mktemp -d "${TMPDIR:-/tmp}/launch-all-test.XXXXXX")"
trap 'rm -rf "$work"' EXIT
tab=$'\t'
# The analyzer's run-id shape, ^[A-Za-z0-9][A-Za-z0-9._-]*$, narrowed to this scenario's prefix.
id_re="^$scenario-claude-auto-[A-Za-z0-9._-]+\$"
failed=0

fail() { echo "FAIL: $label: $1"; failed=$((failed + 1)); return 1; }
rep() { local i=0; while [ "$i" -lt "$1" ]; do echo "$2"; i=$((i + 1)); done; }   # rep <count> <kind>
alternation() { local i="$1"; while [ "$i" -le "$2" ]; do printf 'baseline p%s\nnew p%s\n' "$i" "$i"; i=$((i + 1)); done; }
# Paths and contents of everything under control/. The live campaign writes its
# manifest and logs here (OUT_DIR's default), so a launch that ignored OUT_DIR
# would add to or overwrite real evidence.
snapshot() { (cd "$here" && find . -print | LC_ALL=C sort && find . -type f -exec shasum {} + | LC_ALL=C sort); }

# run_case <dir> <kind>...: a fresh campaign root, two empty worktrees and an
# OUT_DIR; the kinds become the fake's script, one line per launch in launch
# order; then one launcher run. Sets c (the case directory), m (its manifest),
# rc (the launcher's exit status) and before (the control/ snapshot).
run_case() {
  c="$work/$1"; shift
  mkdir -p "$c/root" "$c/tree-baseline" "$c/tree-new" "$c/out"
  printf '%s\n' "$@" > "$c/script"
  before="$(snapshot)"
  FAKE_SCRIPT="$c/script" QUORUM_RUN_CMD="/bin/bash $here/fake-quorum.sh run" \
    TALLY="$here/../tally.py" OUT_DIR="$c/out" \
    /bin/bash "$launcher" "$c/root" "$c/tree-baseline" "$c/tree-new" > "$c/stdout" 2> "$c/stderr"
  rc=$?
  m="$c/out/manifest.tsv"
}

expect_exit() { [ "$rc" -eq "$1" ] || fail "launcher exited $rc, want $1 ($(tail -1 "$c/stderr" 2>/dev/null))"; }
rows() { awk -F'\t' 'NR > 1 && $1 != "stop" { print $2 " " $3 }' "$m"; }   # "<arm> <proc>" per data row
qualifying() { awk -F'\t' -v a="$1" 'NR > 1 && $1 != "stop" && $2 == a && $6 !~ /^void-/ { n++ } END { print n + 0 }' "$m"; }

# The checks every case shares. Row N is the launch the fake made from script
# line N: the same run id, run in its arm's worktree, with the scripted kind
# (so a void row's kind came from classify reading a verdict with no
# result.json) and the exit status the fake gave it. Its log holds that run-id
# line and no other, the analyzer's one-run-per-log rule; run ids are distinct
# and of the shape the analyzer accepts. A stop is the last line, and nothing
# was launched after it. Nothing was written under control/.
common() {
  [ "$(snapshot)" = "$before" ] || { fail "something under control/ was written"; return 1; }
  [ -f "$m" ] || { fail "no manifest at $m"; return 1; }
  [ "$(head -1 "$m")" = "seq${tab}arm${tab}proc${tab}run_id${tab}exit${tab}kind${tab}note" ] \
    || { fail "manifest header is '$(head -1 "$m")'"; return 1; }
  local bad
  bad="$(awk -F'\t' 'NR > 1 && !($1 == "stop" && NF == 2) && NF != 7 { print NR ": " $0 }' "$m")"
  [ -z "$bad" ] || { fail "malformed manifest line $bad"; return 1; }
  bad="$(awk -F'\t' '$1 == "stop" { n++; s = NR } END { if (n > 1 || (n == 1 && s != NR)) print n " stop line(s), the last on line " s }' "$m")"
  [ -z "$bad" ] || { fail "$bad of $(wc -l < "$m" | tr -d ' ')"; return 1; }
  awk -F'\t' 'NR > 1 && $1 != "stop"' "$m" | tr '\t' '\037' > "$c/rows"
  local i=0 seen=" " seq arm proc run_id ex kind note want_kind want_exit tree trace log
  while IFS=$'\037' read -r seq arm proc run_id ex kind note; do
    i=$((i + 1))
    [ "$seq" = "$i" ] || { fail "data row $i has seq '$seq'"; return 1; }
    case "$arm" in
      baseline) tree="$c/tree-baseline" ;;
      new) tree="$c/tree-new" ;;
      *) fail "row $i has arm '$arm'"; return 1 ;;
    esac
    want_kind="$(sed -n "${i}p" "$c/script")"
    [ "$kind" = "$want_kind" ] || { fail "row $i ($arm $proc) has kind '$kind'; the fake was scripted '$want_kind'"; return 1; }
    case "$want_kind" in pass) want_exit=0 ;; fail) want_exit=1 ;; *) want_exit=2 ;; esac
    [ "$ex" = "$want_exit" ] || { fail "row $i ($arm $proc) has exit '$ex'; the fake exited $want_exit"; return 1; }
    [[ $run_id =~ $id_re ]] || { fail "row $i has run id '$run_id', not one the analyzer accepts"; return 1; }
    case "$seen" in *" $run_id "*) fail "row $i repeats run id $run_id"; return 1 ;; esac
    seen="$seen$run_id "
    trace="$(awk -F'\t' -v n="$i" '$1 == n { print $2 "\t" $3 }' "$c/script.trace")"
    [ "$trace" = "$run_id$tab$(cd "$tree" && pwd -P)" ] \
      || { fail "row $i ($arm $proc $run_id) is not launch $i in the $arm worktree (the fake recorded '$trace')"; return 1; }
    log="$c/out/logs/$arm/control-$scenario-$proc.log"
    [ "$(sed -n 's/^run-id: //p' "$log" 2>/dev/null)" = "$run_id" ] \
      || { fail "$log does not hold exactly one run-id line, $run_id"; return 1; }
  done < "$c/rows"
  # A launch that printed no run-id is the one launch with no row.
  local launched expected="$i"
  launched="$(cat "$c/script.pos" 2>/dev/null || echo 0)"
  case "$(tail -1 "$m")" in "stop${tab}no run-id in "*) expected=$((i + 1)) ;; esac
  [ "$launched" = "$expected" ] || { fail "the fake was launched $launched time(s) for $i manifest row(s)"; return 1; }
}

case_1() {
  run_case c1 $(rep 20 pass)
  expect_exit 0 && common || return
  [ "$(rows)" = "$(alternation 1 10)" ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  local arm want i
  want="$(for i in 1 2 3 4 5 6 7 8 9 10; do echo "control-$scenario-p$i.log"; done | LC_ALL=C sort)"
  for arm in baseline new; do
    [ "$(ls "$c/out/logs/$arm" | LC_ALL=C sort)" = "$want" ] \
      || { fail "logs/$arm holds $(ls "$c/out/logs/$arm" | tr '\n' ' ')"; return; }
  done
  [ -z "$(awk -F'\t' 'NR > 1 && $5 != "0"' "$m")" ] || { fail "an exit column is not 0"; return; }
  echo "PASS: $label: twenty passes alternate baseline,new over p1..p10 with ten logs per arm and every exit 0"
}

case_2() {
  run_case c2 $(rep 4 pass) fail $(rep 15 pass)
  expect_exit 0 && common || return
  [ "$(rows)" = "$(alternation 1 10)" ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  local got
  got="$(awk -F'\t' '$2 == "baseline" && $3 == "p3" { print $5 " " $6 }' "$m")"
  [ "$got" = "1 fail" ] || { fail "baseline p3 has exit and kind '$got', want '1 fail'"; return; }
  [ "$(qualifying baseline) $(qualifying new)" = "10 10" ] \
    || { fail "qualifying rows: baseline $(qualifying baseline), new $(qualifying new)"; return; }
  echo "PASS: $label: a baseline failure keeps exit 1 and kind fail and counts as a trial"
}

case_3() {
  run_case c3 pass pass void-grader-exit $(rep 18 pass)
  expect_exit 0 && common || return
  local want
  want="$(printf 'baseline p1\nnew p1\nbaseline p2\nbaseline r1\nnew p2\n'; alternation 3 10)"
  [ "$(rows)" = "$want" ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  [ "$(qualifying baseline) $(qualifying new)" = "10 10" ] \
    || { fail "qualifying rows: baseline $(qualifying baseline), new $(qualifying new)"; return; }
  echo "PASS: $label: a baseline grader-exit void is replaced by baseline r1 before new p2, ten qualifying rows per arm"
}

case_4() {
  # The four voids fall on three procs, so the cap is counted per arm, not per proc.
  # The trailing passes are there for a launcher that fails to stop to reach.
  run_case c4 void-grader-exit pass pass void-grader-exit pass pass void-grader-exit void-grader-exit $(rep 20 pass)
  expect_exit 3 && common || return
  [ "$(tail -1 "$m")" = "stop${tab}void-cap baseline" ] || { fail "last line is '$(tail -1 "$m")'"; return; }
  local want
  want="$(printf 'baseline p1\nbaseline r1\nnew p1\nbaseline p2\nbaseline r2\nnew p2\nbaseline p3\nbaseline r3\n')"
  [ "$(rows)" = "$want" ] || { fail "rows run $(rows | tr '\n' ','), want the fourth void (baseline r3) last"; return; }
  echo "PASS: $label: a fourth baseline grader-exit void stops with exit 3 and void-cap baseline, nothing after it"
}

case_5() {
  run_case c5 void-harness-setup $(rep 4 pass) void-grader-exit $(rep 4 pass) void-grader-exit $(rep 4 pass) void-grader-exit $(rep 8 pass)
  expect_exit 0 && common || return
  local got
  got="$(awk -F'\t' 'NR == 2 || NR == 3 { print $2 " " $3 " " $6 }' "$m" | tr '\n' ',')"
  [ "$got" = "baseline p1 void-harness-setup,baseline r1 pass," ] || { fail "the first two rows are '$got'"; return; }
  [ "$(awk -F'\t' '$2 == "baseline" && $6 == "void-grader-exit"' "$m" | wc -l | tr -d ' ')" = 3 ] \
    || { fail "want three baseline grader-exit voids"; return; }
  [ "$(qualifying baseline) $(qualifying new)" = "10 10" ] \
    || { fail "qualifying rows: baseline $(qualifying baseline), new $(qualifying new)"; return; }
  echo "PASS: $label: a baseline setup void is relaunched as r1 without consuming the cap, three grader-exit voids still complete"
}

case_6() {
  local k got
  for k in void-harness-setup qa-agent-misconfigured; do
    run_case "c6-$k" pass "$k" $(rep 20 pass)
    expect_exit 2 && common || return
    [ "$(rows | tr '\n' ',')" = "baseline p1,new p1," ] || { fail "$k: rows run $(rows | tr '\n' ',')"; return; }
    got="$(awk -F'\t' 'NR == 3 { print $4 }' "$m")"
    [ "$(tail -1 "$m")" = "stop${tab}new-arm-setup $got" ] || { fail "$k: last line is '$(tail -1 "$m")'"; return; }
  done
  echo "PASS: $label: a new-arm setup void and a new-arm QA-agent misconfiguration each stop with exit 2, nothing after"
}

case_7() {
  run_case c7 pass pass no-run-id $(rep 20 pass)
  expect_exit 1 && common || return
  [ "$(rows | tr '\n' ',')" = "baseline p1,new p1," ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  [ "$(tail -1 "$m")" = "stop${tab}no run-id in $c/out/logs/baseline/control-$scenario-p2.log" ] \
    || { fail "last line is '$(tail -1 "$m")'"; return; }
  echo "PASS: $label: a launch that prints no run-id stops with exit 1 and names its log"
}

label="case 1"; case_1
label="case 2"; case_2
label="case 3"; case_3
label="case 4"; case_4
label="case 5"; case_5
label="case 6"; case_6
label="case 7"; case_7
[ "$failed" -eq 0 ] || { echo "$failed of 7 cases failed" >&2; exit 1; }
