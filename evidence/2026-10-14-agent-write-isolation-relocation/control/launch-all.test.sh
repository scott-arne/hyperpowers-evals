#!/usr/bin/env bash
# Proves launch-all.sh runs the paired control as a sequential, alternating
# state machine (B p1, N p1, B p2, N p2, ...): every launch's exit status kept,
# a failure counted as a trial, a grader-exit void replaced in place and capped
# at three per arm, a baseline setup void relaunched without touching that cap,
# a new-arm setup or QA-agent misconfiguration an immediate stop, and a launch
# with no run-id a stop. It also refuses bad input before writing anything, and
# stops at once on what the analyzer would reject (a baseline QA-agent
# misconfiguration, several run ids in a log, a malformed or repeated run id,
# two result files, a verdict classify cannot read). Each case scripts the kind
# every launch returns through fake-quorum.sh, and the launcher classifies it
# with the real tally.py. The launcher runs under /bin/bash, 3.2 on this host,
# the only bash it has.
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

fail() { echo "FAIL: $label${sub:+ ($sub)}: $1"; failed=$((failed + 1)); return 1; }   # sub names a case's sub-run
rep() { local i=0; while [ "$i" -lt "$1" ]; do echo "$2"; i=$((i + 1)); done; }   # rep <count> <kind>
alternation() { local i="$1"; while [ "$i" -le "$2" ]; do printf 'baseline p%s\nnew p%s\n' "$i" "$i"; i=$((i + 1)); done; }
# snapshot <dir>: paths and contents of everything under it. Taken of control/
# around every launcher run: the live campaign writes its manifest and logs
# there (OUT_DIR's default), so a launch that ignored OUT_DIR would add to or
# overwrite real evidence.
snapshot() { (cd "$1" && find . -print | LC_ALL=C sort && find . -type f -exec shasum {} + | LC_ALL=C sort); }

# setup_case <dir> <kind>...: a fresh campaign root, two empty worktrees and an
# OUT_DIR; the kinds become the fake's script, one line per launch in launch
# order. Sets c (the case directory), o (its OUT_DIR, which a case may move
# before the launcher runs), m (the manifest path in o) and before (the control/
# snapshot).
setup_case() {
  c="$work/$1"; shift
  mkdir -p "$c/root" "$c/tree-baseline" "$c/tree-new" "$c/out"
  printf '%s\n' "$@" > "$c/script"
  o="$c/out"; m="$o/manifest.tsv"
  before="$(snapshot "$here")"
}
# launcher_in <cwd> <tag> <arg>...: one launcher run from <cwd> with the case's
# fake script and OUT_DIR, its output in $c/stdout<tag> and $c/stderr<tag>.
launcher_in() {
  local cwd="$1" tag="$2"; shift 2
  (cd "$cwd" && FAKE_SCRIPT="$c/script" QUORUM_RUN_CMD="/bin/bash $here/fake-quorum.sh run" \
    TALLY="$here/../tally.py" OUT_DIR="$o" /bin/bash "$launcher" "$@") > "$c/stdout$tag" 2> "$c/stderr$tag"
}
# invoke_in <cwd> <arg>...: launcher_in with untagged output. Sets rc.
invoke_in() { local cwd="$1"; shift; launcher_in "$cwd" "" "$@"; rc=$?; }
run_case() { setup_case "$@"; invoke_in "$c" "$c/root" "$c/tree-baseline" "$c/tree-new"; }   # run_case <dir> <kind>...

expect_exit() { [ "$rc" -eq "$1" ] || fail "launcher exited $rc, want $1 ($(tail -1 "$c/stderr" 2>/dev/null))"; }
rows() { awk -F'\t' 'NR > 1 && $1 != "stop" { print $2 " " $3 }' "$m"; }   # "<arm> <proc>" per data row
traced_id() { awk -F'\t' -v n="$1" '$1 == n { print $2 }' "$c/script.trace"; }   # the run id the fake printed on line N
# last_is <reason>: the manifest's last line is the stop line for <reason>.
last_is() { [ "$(tail -1 "$m")" = "stop$tab$1" ] || fail "last line is '$(tail -1 "$m")', want a stop for '$1'"; }
qualifying() { awk -F'\t' -v a="$1" 'NR > 1 && $1 != "stop" && $2 == a && $6 !~ /^void-/ { n++ } END { print n + 0 }' "$m"; }

# The checks every case shares. Row N is the launch the fake made from script
# line N: the same run id, run in its arm's worktree, with the scripted kind
# (so a void row's kind came from classify reading a verdict with no
# result.json) and the exit status the fake gave it. Its log holds that run-id
# line and no other, the analyzer's one-run-per-log rule; run ids are distinct
# and of the shape the analyzer accepts. A stop is the last line, and nothing
# was launched after it. Nothing was written under control/.
common() {
  [ "$(snapshot "$here")" = "$before" ] || { fail "something under control/ was written"; return 1; }
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
    case "$want_kind" in pass) want_exit=0 ;; fail) want_exit=1 ;; *) want_exit=2 ;; esac
    # A stalled-agent run is ungraded and has no result file, so classify reads it as indeterminate.
    [ "$want_kind" != stalled-agent ] || want_kind=indeterminate
    [ "$kind" = "$want_kind" ] || { fail "row $i ($arm $proc) has kind '$kind'; the fake was scripted '$want_kind'"; return 1; }
    [ "$ex" = "$want_exit" ] || { fail "row $i ($arm $proc) has exit '$ex'; the fake exited $want_exit"; return 1; }
    [[ $run_id =~ $id_re ]] || { fail "row $i has run id '$run_id', not one the analyzer accepts"; return 1; }
    case "$seen" in *" $run_id "*) fail "row $i repeats run id $run_id"; return 1 ;; esac
    seen="$seen$run_id "
    trace="$(awk -F'\t' -v n="$i" '$1 == n { print $2 "\t" $3 }' "$c/script.trace")"
    [ "$trace" = "$run_id$tab$(cd "$tree" && pwd -P)" ] \
      || { fail "row $i ($arm $proc $run_id) is not launch $i in the $arm worktree (the fake recorded '$trace')"; return 1; }
    log="$o/logs/$arm/control-$scenario-$proc.log"
    [ "$(sed -n 's/^run-id: //p' "$log" 2>/dev/null)" = "$run_id" ] \
      || { fail "$log does not hold exactly one run-id line, $run_id"; return 1; }
  done < "$c/rows"
  # A stop the launcher takes before writing the launch's row leaves exactly one
  # launch with no row; every other launch has one.
  local launched expected="$i"
  launched="$(cat "$c/script.pos" 2>/dev/null || echo 0)"
  case "$(tail -1 "$m")" in
    "stop${tab}no run-id in "*|"stop${tab}multiple run-ids in "*|"stop${tab}bad run-id "*|\
    "stop${tab}repeated run-id "*|"stop${tab}result-cardinality="*|"stop${tab}result-invalid="*|\
    "stop${tab}result check failed for "*|"stop${tab}classify failed for "*)
      expected=$((i + 1)) ;;
  esac
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
    sub="$k"; run_case "c6-$k" pass "$k" $(rep 20 pass)
    expect_exit 2 && common || return
    [ "$(rows | tr '\n' ',')" = "baseline p1,new p1," ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
    got="$(awk -F'\t' 'NR == 3 { print $4 }' "$m")"
    last_is "new-arm-setup $got" || return
  done
  sub=""
  echo "PASS: $label: a new-arm setup void and a new-arm QA-agent misconfiguration each stop with exit 2, nothing after"
}

case_7() {
  run_case c7 pass pass no-run-id $(rep 20 pass)
  expect_exit 1 && common || return
  [ "$(rows | tr '\n' ',')" = "baseline p1,new p1," ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  last_is "no run-id in $c/out/logs/baseline/control-$scenario-p2.log (rc=1)" || return
  echo "PASS: $label: a launch that prints no run-id stops with exit 1 and names its log and exit status"
}

case_8() {
  run_case c8 pass pass pass void-grader-exit $(rep 17 pass)
  expect_exit 0 && common || return
  local want
  want="$(alternation 1 2; echo 'new r1'; alternation 3 10)"
  [ "$(rows)" = "$want" ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  [ "$(qualifying baseline) $(qualifying new)" = "10 10" ] \
    || { fail "qualifying rows: baseline $(qualifying baseline), new $(qualifying new)"; return; }
  echo "PASS: $label: a new-arm grader-exit void is replaced by new r1 before baseline p3, ten qualifying rows per arm"
}

case_9() {
  # Laid out as case 4, with setup voids: the relaunch bound is per arm, not per proc.
  run_case c9 void-harness-setup pass pass void-harness-setup pass pass void-harness-setup void-harness-setup $(rep 20 pass)
  expect_exit 3 && common || return
  last_is "relaunch bound baseline" || return
  local want
  want="$(printf 'baseline p1\nbaseline r1\nnew p1\nbaseline p2\nbaseline r2\nnew p2\nbaseline p3\nbaseline r3\n')"
  [ "$(rows)" = "$want" ] || { fail "rows run $(rows | tr '\n' ','), want the fourth setup void (baseline r3) last"; return; }
  echo "PASS: $label: a fourth baseline setup void stops with exit 3 and relaunch bound baseline, nothing after it"
}

case_10() {
  run_case c10 qa-agent-misconfigured $(rep 20 pass)
  expect_exit 2 && common || return
  [ "$(rows | tr '\n' ',')" = "baseline p1," ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  last_is "baseline-qa-misconfigured $(awk -F'\t' 'NR == 2 { print $4 }' "$m")" || return
  echo "PASS: $label: a baseline QA-agent misconfiguration is recorded and stops with exit 2, nothing after it"
}

case_11() {
  # Each scripted anomaly is otherwise a passing run, so only the guard stops it.
  sub=two-run-ids; run_case c11-two-run-ids pass two-run-ids $(rep 20 pass)
  expect_exit 1 && common || return
  [ "$(rows | tr '\n' ',')" = "baseline p1," ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  last_is "multiple run-ids in $c/out/logs/new/control-$scenario-p1.log (rc=0)" || return

  sub=bad-run-id; run_case c11-bad-run-id bad-run-id $(rep 20 pass)
  expect_exit 1 && common || return
  [ -z "$(rows)" ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  last_is "bad run-id $(traced_id 1) in $c/out/logs/baseline/control-$scenario-p1.log (rc=0)" || return

  # The same anomaly from a launch that exited 1: the reason carries that status.
  sub=bad-run-id-fail; run_case c11-bad-run-id-fail pass bad-run-id-fail $(rep 20 pass)
  expect_exit 1 && common || return
  [ "$(rows | tr '\n' ',')" = "baseline p1," ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  last_is "bad run-id $(traced_id 2) in $c/out/logs/new/control-$scenario-p1.log (rc=1)" || return

  # The repeat is of the other arm's run id.
  sub=repeat-run-id; run_case c11-repeat-run-id pass repeat-run-id $(rep 20 pass)
  expect_exit 1 && common || return
  [ "$(rows | tr '\n' ',')" = "baseline p1," ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  last_is "repeated run-id $(awk -F'\t' 'NR == 2 { print $4 }' "$m") in $c/out/logs/new/control-$scenario-p1.log (rc=0)" || return

  sub=two-results; run_case c11-two-results pass pass two-results $(rep 20 pass)
  expect_exit 1 && common || return
  [ "$(rows | tr '\n' ',')" = "baseline p1,new p1," ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  last_is "result-cardinality=2 for $(traced_id 3) (rc=0)" || return

  # The analyzer's evidence check reads verdict.json first, so a missing one stops there.
  sub=no-verdict; run_case c11-no-verdict pass no-verdict $(rep 20 pass)
  expect_exit 1 && common || return
  [ "$(rows | tr '\n' ',')" = "baseline p1," ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  last_is "result check failed for $(traced_id 2) (rc=2)" || return

  sub=unclassifiable; run_case c11-unclassifiable pass unclassifiable $(rep 20 pass)
  expect_exit 1 && common || return
  [ "$(rows | tr '\n' ',')" = "baseline p1," ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  last_is "classify failed for $(traced_id 2) (rc=2)" || return
  sub=""
  echo "PASS: $label: several run ids in a log, a malformed or repeated run id, two result files and an unreadable verdict each stop with exit 1 and the launch's status"
}

# refused <what>: the launcher exited 1 with a usage line and wrote nothing: no
# manifest or log, no launch, no relative root created anywhere, control/ as it was.
refused() {
  [ "$rc" -eq 1 ] || { fail "$1: launcher exited $rc, want 1"; return 1; }
  case "$(head -1 "$c/stderr")" in usage:*) ;; *) fail "$1: stderr starts '$(head -1 "$c/stderr")', want a usage line"; return 1 ;; esac
  [ -z "$(ls -A "$c/out")" ] || { fail "$1: OUT_DIR holds $(ls -A "$c/out" | tr '\n' ' ')"; return 1; }
  [ ! -e "$c/script.pos" ] || { fail "$1: the fake was launched"; return 1; }
  [ -z "$(find "$c" -name rel-root)" ] || { fail "$1: a relative root was created at $(find "$c" -name rel-root)"; return 1; }
  [ "$(snapshot "$here")" = "$before" ] || { fail "$1: something under control/ was written"; return 1; }
}

case_12() {
  setup_case c12 $(rep 20 pass)
  mkdir -p "$c/cwd"
  invoke_in "$c/cwd" "$c/root" "$c/tree-baseline"; refused "two arguments" || return
  invoke_in "$c/cwd" rel-root "$c/tree-baseline" "$c/tree-new"; refused "a relative root" || return
  invoke_in "$c/cwd" "$c/root" "$c/missing" "$c/tree-new"; refused "a missing baseline worktree" || return
  invoke_in "$c/cwd" "$c/root" "$c/tree-baseline" "$c/missing"; refused "a missing new worktree" || return
  # A complete first run, then a second into the same OUT_DIR.
  invoke_in "$c/cwd" "$c/root" "$c/tree-baseline" "$c/tree-new"
  expect_exit 0 && common || return
  local first_out
  cp "$m" "$c/first-manifest"; first_out="$(snapshot "$c/out")"
  invoke_in "$c/cwd" "$c/root" "$c/tree-baseline" "$c/tree-new"
  [ "$rc" -eq 1 ] || { fail "second run: launcher exited $rc, want 1"; return; }
  grep -qF "$m" "$c/stderr" || { fail "second run: stderr does not name $m: '$(head -1 "$c/stderr")'"; return; }
  cmp -s "$m" "$c/first-manifest" || { fail "second run: the first manifest changed"; return; }
  [ "$(snapshot "$c/out")" = "$first_out" ] || { fail "second run: OUT_DIR changed"; return; }
  [ "$(cat "$c/script.pos")" = 20 ] || { fail "second run: the fake was launched again"; return; }
  [ "$(snapshot "$here")" = "$before" ] || { fail "second run: something under control/ was written"; return; }
  echo "PASS: $label: a wrong argument count, a relative root, a missing worktree and an existing manifest are refused with exit 1, nothing written"
}

case_13() {
  # A graded verdict (final pass or fail, no error) needs exactly one result file
  # of the shape criterion 1 reads, as the analyzer requires.
  sub=pass-no-result; run_case c13-no-result pass pass-no-result $(rep 20 pass)
  expect_exit 1 && common || return
  [ "$(rows | tr '\n' ',')" = "baseline p1," ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  last_is "result-cardinality=0 for $(traced_id 2) (rc=0)" || return

  sub=pass-invalid-result; run_case c13-invalid-result pass pass-invalid-result $(rep 20 pass)
  expect_exit 1 && common || return
  [ "$(rows | tr '\n' ',')" = "baseline p1," ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  last_is "result-invalid=criteria=missing for $(traced_id 2) (rc=0)" || return

  # The count is the analyzer's: a result file under a dot directory counts too.
  sub=dot-results; run_case c13-dot-results pass dot-results $(rep 20 pass)
  expect_exit 1 && common || return
  [ "$(rows | tr '\n' ',')" = "baseline p1," ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  last_is "result-cardinality=2 for $(traced_id 2) (rc=0)" || return

  # A stalled run is ungraded: no result file is needed, and it is a trial.
  sub=stalled-agent; run_case c13-stalled pass stalled-agent $(rep 18 pass)
  expect_exit 0 && common || return
  [ "$(rows)" = "$(alternation 1 10)" ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  [ "$(awk -F'\t' 'NR == 3 { print $2 " " $3 " " $5 " " $6 }' "$m")" = "new p1 2 indeterminate" ] \
    || { fail "row 2 is '$(awk -F'\t' 'NR == 3' "$m")'"; return; }
  [ "$(qualifying baseline) $(qualifying new)" = "10 10" ] \
    || { fail "qualifying rows: baseline $(qualifying baseline), new $(qualifying new)"; return; }
  sub=""
  echo "PASS: $label: a graded pass without exactly one valid result file (none, an invalid one, a second under a dot directory) stops with exit 1; a stalled run still counts as indeterminate"
}

case_14() {
  # An OUT_DIR that does not exist yet is created, and the manifest starts with its header.
  sub=missing; setup_case c14-missing $(rep 20 pass)
  o="$c/new/nested/out"; m="$o/manifest.tsv"
  invoke_in "$c" "$c/root" "$c/tree-baseline" "$c/tree-new"
  expect_exit 0 && common || return
  [ "$(rows)" = "$(alternation 1 10)" ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  # One that cannot be created (a path through a regular file) stops before any launch.
  sub=uncreatable; setup_case c14-uncreatable $(rep 20 pass)
  printf 'not a directory\n' > "$c/file"; o="$c/file/out"; m="$o/manifest.tsv"
  invoke_in "$c" "$c/root" "$c/tree-baseline" "$c/tree-new"
  [ "$rc" -eq 1 ] || { fail "launcher exited $rc, want 1"; return; }
  grep -qF "$o" "$c/stderr" || { fail "stderr does not name the OUT_DIR: '$(tail -1 "$c/stderr")'"; return; }
  [ ! -e "$c/script.pos" ] || { fail "the fake was launched"; return; }
  [ "$(snapshot "$here")" = "$before" ] || { fail "something under control/ was written"; return; }
  sub=""
  echo "PASS: $label: a missing OUT_DIR is created with a headed manifest; one that cannot be created stops with exit 1 before any launch"
}

case_15() {
  # Two starts against one empty OUT_DIR at once: one claims the manifest and runs, the other stops.
  setup_case c15 $(rep 20 pass)
  local p1 p2 rc1 rc2 loser
  launcher_in "$c" 1 "$c/root" "$c/tree-baseline" "$c/tree-new" & p1=$!
  launcher_in "$c" 2 "$c/root" "$c/tree-baseline" "$c/tree-new" & p2=$!
  wait "$p1"; rc1=$?
  wait "$p2"; rc2=$?
  case "$rc1 $rc2" in
    "0 1") loser=2 ;;
    "1 0") loser=1 ;;
    *) fail "the two starts exited $rc1 and $rc2, want one 0 and one 1 ($(tail -1 "$c/stderr1") / $(tail -1 "$c/stderr2"))"; return ;;
  esac
  grep -qF "$m" "$c/stderr$loser" || { fail "the losing start's stderr does not name $m: '$(head -1 "$c/stderr$loser")'"; return; }
  [ "$(grep -c "^seq$tab" "$m")" = 1 ] || { fail "the manifest has $(grep -c "^seq$tab" "$m") header lines"; return; }
  common || return
  [ "$(rows)" = "$(alternation 1 10)" ] || { fail "rows run $(rows | tr '\n' ',')"; return; }
  [ "$(cat "$c/script.pos")" = 20 ] || { fail "the fake was launched $(cat "$c/script.pos") times, want 20"; return; }
  echo "PASS: $label: of two simultaneous starts one runs twenty launches under one header and the other stops with exit 1"
}

case_16() {
  # A manifest write that fails stops the launcher with exit 1 and nothing further is launched.
  local what
  for what in row stop; do
    sub="$what"
    if [ "$what" = row ]; then
      setup_case c16-row pass readonly-manifest $(rep 20 pass)
    else
      setup_case c16-stop pass readonly-manifest-no-run-id $(rep 20 pass)
    fi
    invoke_in "$c" "$c/root" "$c/tree-baseline" "$c/tree-new"
    [ "$rc" -eq 1 ] || { fail "launcher exited $rc, want 1 ($(tail -1 "$c/stderr"))"; return; }
    if [ "$what" = row ]; then
      grep -qF "cannot append row 2 to $m" "$c/stderr" || { fail "stderr does not report the failed row: '$(tail -1 "$c/stderr")'"; return; }
    else
      grep -qF "cannot append the stop line to $m: no run-id in " "$c/stderr" \
        || { fail "stderr does not report the failed stop line: '$(tail -1 "$c/stderr")'"; return; }
    fi
    [ "$(wc -l < "$m" | tr -d ' ')" = 2 ] || { fail "the manifest has $(wc -l < "$m" | tr -d ' ') lines, want the header and row 1"; return; }
    [ "$(cat "$c/script.pos")" = 2 ] || { fail "the fake was launched $(cat "$c/script.pos") times, want 2"; return; }
    [ "$(snapshot "$here")" = "$before" ] || { fail "something under control/ was written"; return; }
  done
  sub=""
  echo "PASS: $label: a failed row write and a failed stop write each stop the launcher with exit 1, nothing launched after"
}

cases=0
for n in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16; do label="case $n"; sub=""; cases=$((cases + 1)); "case_$n"; done
[ "$failed" -eq 0 ] || { echo "$failed of $cases cases failed" >&2; exit 1; }
