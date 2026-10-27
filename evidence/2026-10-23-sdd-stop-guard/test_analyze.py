"""Tests for analyze.py on synthetic runs."""

from __future__ import annotations

import json
import shlex
import shutil
import sys
import tempfile
import unittest
from collections.abc import Mapping
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import analyze
import liveness
from liveness import parse_ts
from synth import (
    AGENT_BG,
    BASH_BG,
    LEDGER,
    RELOAD_RESULT,
    assistant,
    at,
    control_records,
    human,
    ledger_text,
    line,
    make_run,
    notification,
    result,
    treatment_records,
    write,
)

CONTROL_STOPS = (("Moving to Task 3.", "neither"),)
TRACKED_JOB = "bash /roots/treatment/skills/subagent-driven-development/scripts/tracked-job"
WAIT_OK = "status=exited code=0\n"
# The long soak and its watch share the synthetic timeline, because the watch
# has to be causal: it starts after the launch and answers after the exit.
LONG_JOB = {
    "name": "soak-long", "state": "exited", "code": 0,
    "command": ["python3", "-m", "unittest", "tests.test_soak_long", "-v"],
    "launched": at(20), "ended": at(800),
}
WATCH_AT = 30.0
WATCH_DONE = 810.0


def drop_call(records: list[dict[str, Any]], tool_id: str) -> list[dict[str, Any]]:
    """The records without one tool call and its result."""
    def mentions(rec: dict[str, Any]) -> bool:
        return any(b.get("id") == tool_id or b.get("tool_use_id") == tool_id for b in liveness.blocks(rec))

    return [r for r in records if not mentions(r)]


def successful_run_kwargs() -> dict[str, Any]:
    """The ``make_run`` arguments of a run the success definition accepts.

    A receipt is part of them now: the plan is unfinished until Finish removed
    its workspace, so every successful run has one (spec Decision 5).
    """
    return {"records": treatment_records(), "receipt": {"ledger": ledger_text(done=range(1, 7))}}


def nested(command: str, depth: int) -> str:
    """``command`` wrapped in ``depth`` layers of ``bash -c <operand>``."""
    for _ in range(depth):
        command = f"bash -c {shlex.quote(command)}"
    return command


def wait_command(job: Mapping[str, Any], index: int = 0, quote: str = "", prefix: str = "") -> str:
    """The foreground watch an SDD session runs on one of a receipt's tracked jobs.

    ``_record_dir`` writes a receipt's job records to ``jobs/<name>-x-<n>`` in
    the order it was handed them.

    :param job: the tracked-job record the wait names.
    :param index: the job's position among the receipt's records.
    :param quote: the quote character the session wrapped the job path in, if any.
    :param prefix: anything the session ran before the wait in the same call.
    """
    return f"{prefix}{TRACKED_JOB} wait {quote}jobs/{job['name']}-x-{index}{quote} --max-ms 600000"


def watch_records(
    command: str,
    *,
    at_s: float = WATCH_AT,
    result_s: float = WATCH_DONE,
    background: bool = False,
    is_error: bool = False,
    text: str = WAIT_OK,
) -> list[dict[str, Any]]:
    """Main-session records holding one Bash call that claims to watch a tracked job."""
    inp: dict[str, Any] = {"command": command, "timeout": 600000}
    if background:
        inp["run_in_background"] = True
    return [
        human(0, "go"),
        assistant(at_s, tools=[("w1", "Bash", inp)]),
        result(result_s, "w1", text, is_error=is_error),
        assistant(result_s + 10, "The long soak exited 0."),
    ]


def turn_end_with_live(kind: str, complete: bool = True) -> list[dict[str, Any]]:
    """A turn that ends while a launch of ``kind`` is live.

    :param kind: ``agent``, ``shell``, or ``both``.
    :param complete: whether each launch records a completion after the turn
        end; without one the session walked away and never saw it finish.
    """
    agent = kind in ("agent", "both")
    shell = kind in ("shell", "both")
    recs: list[dict[str, Any]] = [human(0, "go")]
    if agent:
        recs += [assistant(10, tools=[("a1", "Agent", {"description": "Implement Task 1"})]),
                 result(11, "a1", AGENT_BG)]
    if shell:
        recs += [assistant(20, tools=[("b1", "Bash", {"command": "sleep 900", "run_in_background": True})]),
                 result(21, "b1", BASH_BG)]
    recs.append(human(100, "continue"))
    if complete and agent:
        recs.append(notification(200, "a1"))
    if complete and shell:
        recs.append(notification(210, "b1"))
    return recs


class Measure(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def run_of(self, run_id: str, records: list[dict[str, Any]], **kw: Any) -> dict[str, Any]:
        kw.setdefault("plugin_dir", "/roots/treatment")
        # A finished plan is a receipt now, not a ledger left in the cache, so
        # every run these cases measure publishes one.
        kw.setdefault("receipt", {"ledger": ledger_text(done=range(1, 7))})
        return analyze.measure(make_run(self.root, run_id, records, **kw), {})

    def test_treatment_like_run_meets_every_measure(self) -> None:
        m = self.run_of("t1", treatment_records())
        self.assertEqual((m["dispatch_fg"], m["dispatch_bg"], m["dispatch_unclassified"]), (2, 0, 0))
        self.assertTrue(m["short_ok"])
        self.assertEqual(m["censored_stops"], 0)
        self.assertEqual(m["live_turn_ends"], [])
        self.assertEqual(m["untracked"], [])
        self.assertTrue(m["plan_complete"] and m["final_review"] and m["success"])
        self.assertEqual((m["plugin_dir"], m["model"], m["cc"]), ("/roots/treatment", "claude-opus-5-5", "2.1.300"))
        self.assertTrue(m["task_tools"])
        self.assertTrue(m["codex_absent"])

    def test_control_like_run(self) -> None:
        m = self.run_of("c1", control_records(), plugin_dir="/roots/control", stops=CONTROL_STOPS)
        self.assertEqual((m["dispatch_fg"], m["dispatch_bg"]), (0, 2))
        self.assertEqual(len(m["live_turn_ends"]), 1)
        self.assertEqual(m["live_turn_ends"][0]["idle_seconds"], 170.0)
        self.assertFalse(m["short_ok"])
        self.assertEqual([u["where"] for u in m["untracked"]], ["command"])
        self.assertTrue(m["success"])

    def test_dispatch_needs_the_explicit_false_and_a_clean_result(self) -> None:
        records = treatment_records()
        records += [
            assistant(2000, tools=[("x1", "Agent", {"description": "Review Task 2"})]),
            result(2100, "x1", "DONE: reviewed"),
            assistant(2110, tools=[("x2", "Agent", {"description": "Fix Task 2", "run_in_background": False})]),
            result(2120, "x2", "API Error", is_error=True),
        ]
        m = self.run_of("t5", records)
        self.assertEqual((m["dispatch_fg"], m["dispatch_bg"], m["dispatch_unclassified"]), (2, 0, 2))

    def test_a_censored_task_overlapping_a_live_one_excludes_the_stop(self) -> None:
        # One launch records its completion, the other never does; a stop while
        # both are open is censored, not live (deviation 3, liveness.state_at).
        def records(censored: bool) -> list[dict[str, Any]]:
            recs = [
                human(0, "I have a plan at plan.md. Use subagent-driven-development."),
                assistant(10, tools=[("a1", "Agent", {"description": "Implement Task 1"})]),
                result(11, "a1", AGENT_BG),
            ]
            if censored:
                recs += [
                    assistant(20, tools=[("b1", "Bash", {"command": "sleep 900", "run_in_background": True})]),
                    result(21, "b1", BASH_BG),
                ]
            return [*recs, assistant(30, "Dispatched; waiting."), notification(200, "a1")]

        live = self.run_of("ov1", records(False), ledger=0)
        self.assertEqual([e["idle_seconds"] for e in live["live_turn_ends"]], [170.0])
        self.assertEqual(live["censored_stops"], 0)
        overlap = self.run_of("ov2", records(True), ledger=0)
        self.assertEqual(overlap["live_turn_ends"], [])
        self.assertEqual(overlap["censored_stops"], 1)

    def test_final_review_is_the_review_after_the_last_task(self) -> None:
        records = treatment_records()
        for rec in records:
            for use in liveness.tool_uses(rec):
                if use.get("id") == "a1":
                    use["input"]["prompt"] = "Implement Task 1. The final review runs after Task 6."
                if use.get("id") == "a2":
                    use["input"]["description"] = "Review code changes"
        m = self.run_of("f1", records)
        self.assertTrue(m["final_review"])
        early = [r for r in drop_call(treatment_records(), "a2")]
        early[4:4] = [
            assistant(25, tools=[("r6", "Agent", {"description": "Review Task 6", "run_in_background": False})]),
            result(26, "r6", "Approved"),
        ]
        m = self.run_of("f2", early)
        self.assertFalse(m["final_review"])
        self.assertFalse(m["success"])
        # The controller reviews Task 6, dispatches the final review, and writes
        # the Task 6 mark only after it returns (three of four counted smoke runs).
        late = drop_call(treatment_records(), "lw6")
        tail = late[-3:]
        late = late[:-3] + [
            assistant(1410, tools=[("r6", "Agent", {"description": "Review Task 6 (spec + quality)", "run_in_background": False})]),
            result(1490, "r6", "Approved"),
            *tail[:2],
            assistant(1850, tools=[("e6", "Edit", {"file_path": LEDGER, "old_string": "x", "new_string": "Task 6: complete (abc123)"})]),
            result(1851, "e6", "edited"),
            tail[2],
        ]
        m = self.run_of("f3", late)
        self.assertTrue(m["final_review"])
        self.assertTrue(m["success"])
        # Two task-scoped reviews with no final review are not a final review:
        # a task review then a re-review described without the word fix, and
        # a task review dispatched twice.
        no_final = drop_call(late, "a2")
        for rec in no_final:
            for use in liveness.tool_uses(rec):
                if use.get("id") == "r6":
                    use["input"]["description"] = "Re-review Task 6 (quality)"
        no_final[-4:-4] = [
            assistant(1300, tools=[("r5", "Agent", {"description": "Review Task 6 (spec + quality)", "run_in_background": False})]),
            result(1305, "r5", "Needs fixes"),
        ]
        self.assertFalse(self.run_of("f4", no_final)["final_review"])
        repeated = drop_call(late, "a2")
        repeated[-4:-4] = [
            assistant(1300, tools=[("r5", "Agent", {"description": "Review Task 6 (spec + quality)", "run_in_background": False})]),
            result(1305, "r5", "Approved"),
        ]
        self.assertFalse(self.run_of("f5", repeated)["final_review"])

    def test_split_ops_records_the_operators(self) -> None:
        self.assertEqual(
            analyze._split_ops("a; b && c || d | e\nf"),
            [("", "a"), (";", " b "), ("&&", " c "), ("||", " d "), ("|", " e"), (";", "f")],
        )
        self.assertEqual(analyze._split_ops("a | b", pipes=False), [("", "a | b")])

    def test_auto_backgrounded_short_run_is_not_a_foreground_run(self) -> None:
        moved = "Command did not complete within its 240s timeout and was moved to the background (ID: b-auto)."
        records = [
            result(560, "b1", moved) if r.get("timestamp") == at(560) else r for r in treatment_records()
        ]
        for rec in records:
            for use in liveness.tool_uses(rec):
                if use.get("id") == "b1":
                    use["input"]["timeout"] = 240000
        m = self.run_of("s2", records)
        self.assertTrue(m["short_runs"][0]["background"])
        self.assertFalse(m["short_ok"])

    def test_short_run_must_take_real_time(self) -> None:
        fast = [result(340, "b1", "OK") if r.get("timestamp") == at(560) else r for r in treatment_records()]
        m = self.run_of("s1", fast)
        self.assertEqual(m["short_runs"][0]["elapsed"], 30.0)
        self.assertFalse(m["short_ok"])

    def test_soak_file_writes_fail_success(self) -> None:
        edit = treatment_records() + [
            assistant(2000, tools=[("e1", "Edit", {"file_path": "/x/coding-agent-workdir/tests/test_soak_short.py", "old_string": "240", "new_string": "5"})]),
            result(2001, "e1", "edited"),
        ]
        m = self.run_of("k1", edit)
        self.assertTrue(m["soak_tampered"])
        self.assertFalse(m["success"])
        sed = treatment_records() + [
            assistant(2000, tools=[("e2", "Bash", {"command": "sed -i '' 's/720/5/' tests/test_soak_long.py"})]),
            result(2001, "e2", ""),
        ]
        self.assertTrue(self.run_of("k2", sed)["soak_tampered"])
        read = treatment_records() + [
            assistant(2000, tools=[("e3", "Bash", {"command": "cat tests/test_soak_long.py"})]),
            result(2001, "e3", "SOAK_SECONDS = 720"),
        ]
        self.assertFalse(self.run_of("k3", read)["soak_tampered"])
        self.assertFalse(self.run_of("k4", treatment_records())["soak_tampered"])
        for n, command in enumerate((
            "cp /tmp/short.py tests/test_soak_short.py",
            "python3 -c \"from pathlib import Path; Path('tests/test_soak_long.py').write_text('')\"",
            "python3 - <<'EOF'\nopen('tests/test_soak_short.py', 'w').write('')\nEOF",
            "git checkout -- tests/test_soak_long.py",
            "sed -Ei 's/720/5/' tests/test_soak_long.py",
            "sed --in-place=.bak 's/240/5/' tests/test_soak_short.py",
            "cat <<'EOF' | python3\nopen('tests/test_soak_short.py', 'w').write('')\nEOF",
            "grep -n 'x' tests/test_soak_long.py; perl -pi -e 's/720/5/' tests/test_soak_long.py",
        )):
            written = treatment_records() + [
                assistant(2000, tools=[("m1", "Bash", {"command": command})]),
                result(2001, "m1", ""),
            ]
            self.assertTrue(self.run_of(f"k5{n}", written)["soak_tampered"], command)
        for n, command in enumerate((
            "git diff --quiet HEAD -- tests/test_soak_short.py tests/test_soak_long.py",
            "sed -n '1,20p' tests/test_soak_long.py | head -5",
            "python3 tests/test_soak_short.py",
            "grep -n SOAK_SECONDS tests/test_soak_long.py",
            # Routine reads seen in real runs: quoted pipes, git options, prefixes, echo banners.
            'grep -nE "SOAK|sleep" tests/test_soak_long.py',
            "git -C /x/coding-agent-workdir diff -- tests/test_soak_short.py",
            "git --no-pager diff HEAD -- tests/test_soak_long.py",
            "timeout 900 python3 -m unittest tests/test_soak_long.py",
            "python3 -m pytest tests/test_soak_short.py",
            "nl -ba tests/test_soak_short.py | sed -n '1,40p'",
            'echo "--- tests/test_soak_short.py ---"; cat tests/test_soak_short.py',
            "# look at tests/test_soak_long.py\ncat tests/test_soak_long.py",
        )):
            reads = treatment_records() + [
                assistant(2000, tools=[("m2", "Bash", {"command": command})]),
                result(2001, "m2", ""),
            ]
            self.assertFalse(self.run_of(f"k6{n}", reads)["soak_tampered"], command)

    def test_codex_needs_the_affirmative_precheck(self) -> None:
        self.assertFalse(self.run_of("t2", treatment_records(), codex_check=False)["codex_absent"])
        records = treatment_records()
        records.insert(4, assistant(15, tools=[("c9", "Bash", {"command": 'node "$C/scripts/codex-companion.mjs" status --json'})]))
        records.insert(5, result(16, "c9", "{}"))
        self.assertFalse(self.run_of("t3", records)["codex_absent"])

    def test_failed_post_check_is_not_success(self) -> None:
        m = self.run_of("t4", treatment_records(), checks_pass=False)
        self.assertFalse(m["unit_tests_passed"])
        self.assertFalse(m["soak_tests_passed"])
        self.assertFalse(m["success"])

    def test_void_kinds_fail_closed(self) -> None:
        self.assertEqual(analyze.void_kind({"final": "indeterminate", "final_reason": "quorum error (setup): setup.sh failed", "gauntlet": {}}), "void-setup")
        self.assertEqual(
            analyze.void_kind({"final": "indeterminate", "gauntlet": {"status": "investigate", "summary": "gauntlet exited (status 1) without writing a result"}}),
            "void-grader",
        )
        lost: dict[str, Any] = {
            "final": "indeterminate",
            "gauntlet": {
                "status": "investigate",
                "summary": "gauntlet exited (status 1) without writing a result",
                "reasoning": 'gauntlet stderr (tail): {"error":{"message":"getaddrinfo ENOTFOUND proxy.example"}}',
            },
        }
        self.assertEqual(analyze.void_kind(lost), "void-transport")
        reset = {**lost, "gauntlet": {**lost["gauntlet"], "reasoning": 'gauntlet stderr (tail): {"error":{"message":"ECONNRESET: The socket connection was closed unexpectedly."}}'}}
        self.assertEqual(analyze.void_kind(reset), "void-transport")
        judged = {**lost, "gauntlet": {**lost["gauntlet"], "reasoning": "the agent never answered"}}
        self.assertEqual(analyze.void_kind(judged), "void-grader")
        written = {**lost, "gauntlet": {**lost["gauntlet"], "run_id": "sdd-turn-liveness_x_r1"}}
        self.assertEqual(analyze.void_kind(written), "void-other")
        self.assertEqual(analyze.void_kind({"final": "indeterminate", "final_reason": "API error", "gauntlet": {"status": "investigate"}}), "void-other")
        self.assertEqual(analyze.void_kind({"final": None}), "void-other")
        self.assertIsNone(analyze.void_kind({"final": "fail"}))

    def test_legacy_layout_reads_its_own_home(self) -> None:
        record = self.root / "legacy"
        (record / "home").mkdir(parents=True)
        self.assertEqual(analyze.workspace_of(record), record)


class Measures(unittest.TestCase):
    def test_plan_completion_reads_the_receipt_ledger(self) -> None:
        run = make_run(receipt={"ledger": ledger_text(done=[1, 2, 3, 4, 5, 6])})
        m = analyze.measure(run, {})
        self.assertTrue(m["plan_complete"]); self.assertEqual(m["plan_path"], "plan.md")

    def test_an_unfinished_run_reads_the_live_workspace(self) -> None:
        run = make_run(workspace_ledger=ledger_text(done=[1, 2, 3]))
        m = analyze.measure(run, {})
        self.assertIsNone(m["receipt"]); self.assertFalse(m["plan_complete"]); self.assertFalse(m["live_complete"])

    def test_every_task_done_without_a_receipt_is_not_a_success(self) -> None:
        run = make_run(**{**successful_run_kwargs(), "receipt": None,
                          "workspace_ledger": ledger_text(done=[1, 2, 3, 4, 5, 6])})
        m = analyze.measure(run, {})
        self.assertTrue(m["live_complete"]); self.assertFalse(m["plan_complete"]); self.assertFalse(m["success"])
        run = make_run(**successful_run_kwargs())
        self.assertTrue(analyze.measure(run, {})["success"])

    def test_two_live_workspaces_void_the_run(self) -> None:
        # Nothing says whose log and job records are the run's, so the run is
        # not measurable rather than measured wrong.
        run = make_run(workspace_ledger=ledger_text(done=[1]),
                       extra_workspaces=[{"ledger": ledger_text(done=[2])}])
        m = analyze.measure(run, {})
        self.assertEqual(m["void"], "void-instrument")
        self.assertIn("2 live workspaces", m["void_detail"])

    def test_plan_decisions_count_lines_for_the_plan_only(self) -> None:
        run = make_run(receipt={"ledger": ledger_text(done=[1]),
                                "log": [line("2026-10-23T10:05:00.000Z", "allow", "handback-text")]},
                       mirror=[line("2026-10-23T11:00:00.000Z", "allow", "no-ledger", plan=None),
                               line("2026-10-23T11:01:00.000Z", "allow", "ambiguous", plan=None)])
        m = analyze.measure(run, {})
        self.assertEqual((m["plan_decisions"], m["blocks"], m["allows"]),
                         (1, 0, {"ambiguous": 1, "handback-text": 1, "no-ledger": 1}))
        run = make_run(mirror=[line("2026-10-23T11:00:00.000Z", "allow", "no-ledger", plan=None)])
        self.assertEqual(analyze.measure(run, {})["plan_decisions"], 0)

    def test_listed_stops_match_allows_one_to_one_within_a_minute(self) -> None:
        recs = [human(0, "go"), assistant(10, "Which option do you want?"), human(100, "Task 1 governs"),
                assistant(110, "Second question?"), human(200, "yes"), assistant(300, "Moving to Task 3.")]
        allow = line(at(12), "allow", "handback-text")
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "log": [allow]}, records=recs,
                       stops=[("Which option do you want?", "question"), ("Second question?", "question"),
                              ("Moving to Task 3.", "neither"), ("never said", "neither")])
        m = analyze.measure(run, {(run.name, at(12)): "handback"})
        self.assertEqual(m["neither_listed"], 2)
        # ``stop_lines`` normalizes every quote it lists, so the measures carry
        # the normalized spelling of the sentence the Gauntlet quoted.
        self.assertEqual([q for q, _, _ in m["unmatched_stops"]],
                         ["second question?", "moving to task 3", "never said"])

    def test_an_allow_before_the_stop_does_not_match_it(self) -> None:
        recs = [human(0, "go"), assistant(10, "Which option do you want?"), human(100, "Task 1 governs"),
                assistant(110, "Second question?"), human(200, "yes")]
        early = line(at(80), "allow", "handback-text")
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "log": [early]}, records=recs,
                       stops=[("Second question?", "question")])
        m = analyze.measure(run, {(run.name, at(80)): "handback"})
        self.assertEqual([q for q, _, _ in m["unmatched_stops"]], ["second question?"])
        late = line(at(111), "allow", "handback-text")
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "log": [early, late]}, records=recs,
                       stops=[("Second question?", "question")])
        self.assertEqual(
            analyze.measure(run, {(run.name, at(80)): "handback", (run.name, at(111)): "handback"})["unmatched_stops"],
            [],
        )

    def test_one_allow_in_two_windows_answers_only_the_first_stop(self) -> None:
        # The windows of two stops a few seconds apart overlap, so an allow can
        # sit in both; it still answers one of them, and the stop left over is
        # a stop the hook recorded no decision for.
        stops = [("first", "question", parse_ts(at(10))), ("second", "question", parse_ts(at(20)))]
        matched, unmatched = analyze.match_allows(stops, [line(at(22), "allow", "handback-text")])
        self.assertEqual([q for q, _, _, _ in matched], ["first"])
        self.assertEqual([q for q, _, _ in unmatched], ["second"])

    def test_a_stop_takes_the_nearest_allow_and_a_tie_takes_the_earlier(self) -> None:
        stop = [("q", "question", parse_ts(at(100)))]
        # 98.5 s is inside the 2 s backward tolerance but further away than 101 s.
        matched, _ = analyze.match_allows(
            stop, [line(at(98.5), "allow", "handback-line"), line(at(101), "allow", "handback-text")]
        )
        self.assertEqual(matched[0][3]["ts"], at(101))
        # Equally far on either side, and handed over in the wrong order: the
        # earlier allow wins, so the answer does not depend on log order.
        matched, _ = analyze.match_allows(
            stop, [line(at(101), "allow", "handback-text"), line(at(99), "allow", "handback-line")]
        )
        self.assertEqual(matched[0][3]["ts"], at(99))

    def test_only_a_hand_back_allow_is_owed_an_adjudication(self) -> None:
        # H2 asks whether each hand-back allow was a genuine hand-back. A
        # `no-ledger` or `ambiguous` allow says the hook found no plan to judge,
        # so there is nothing for the human partner to label.
        run = make_run(receipt={"ledger": ledger_text(done=[1]),
                                "log": [line(at(10), "allow", "no-ledger", plan=None),
                                        line(at(20), "allow", "ambiguous", plan=None)]})
        self.assertEqual(analyze.measure(run, {})["unadjudicated_allows"], 0)
        run = make_run(receipt={"ledger": ledger_text(done=[1]),
                                "log": [line(at(10), "allow", "handback-text")]})
        self.assertEqual(analyze.measure(run, {})["unadjudicated_allows"], 1)

    def test_adjudication_labels_blocks_and_allows_by_timestamp(self) -> None:
        log = [line(at(10), "block", "open-tasks", refusals=1), line(at(20), "allow", "handback-text"),
               line(at(30), "allow", "handback-line"), line(at(40), "block", "open-tasks", refusals=1)]
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "log": log})
        m = analyze.measure(run, {(run.name, at(10)): "handback", (run.name, at(20)): "neither",
                                  (run.name, at(30)): "handback"})
        self.assertEqual((m["false_blocks"], m["false_handbacks"], m["unadjudicated_allows"],
                          m["unadjudicated_blocks"]), (1, 1, 0, 1))

    def test_a_decision_conflict_is_counted(self) -> None:
        a = line(at(10), "block", "open-tasks", refusals=1)
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "log": [a]}, mirror=[{**a, "reason": "live-shell"}])
        self.assertEqual(analyze.measure(run, {})["decision_conflicts"], 1)

    def test_long_ok_needs_the_job_record_and_the_foreground_watch(self) -> None:
        job = dict(LONG_JOB)
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [job]},
                       records=watch_records(wait_command(job)))
        self.assertTrue(analyze.measure(run, {})["long_ok"])
        job_fast = {**job, "ended": at(200)}
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [job_fast]},
                       records=watch_records(wait_command(job_fast)))
        self.assertFalse(analyze.measure(run, {})["long_ok"])
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [job]},
                       records=[human(0, "go"), assistant(5, "ok.")])
        self.assertFalse(analyze.measure(run, {})["long_ok"])
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [{**job, "state": "lost"}]},
                       records=watch_records(wait_command(job)))
        self.assertFalse(analyze.measure(run, {})["long_ok"])

    def test_the_watch_must_be_a_command_the_session_ran(self) -> None:
        # Every one of these carries the words of a watch and a result that
        # reads like the helper's, and none of them watched anything.
        job = dict(LONG_JOB)
        jobdir = f"jobs/{job['name']}-x-0"
        for label, records in (
            ("echoed", watch_records(f'echo "status=exited code=0 from {TRACKED_JOB} wait {jobdir}"')),
            ("commented", watch_records(f"# {TRACKED_JOB} wait {jobdir}\nls")),
            ("committed", watch_records(f'git commit -m "watched with tracked-job wait {jobdir}"')),
            ("backgrounded", watch_records(wait_command(job), background=True)),
            ("backgrounded by the shell", watch_records(f"{wait_command(job)} &")),
            ("backgrounded with a command after it", watch_records(f"{wait_command(job)} & sleep 1")),
            ("a trailing ampersand the lexer kept as a word", watch_records(f"{wait_command(job)} \\&")),
            ("errored", watch_records(wait_command(job), is_error=True)),
            ("answered before the job ended", watch_records(wait_command(job), result_s=700.0)),
            ("started before the job launched", watch_records(wait_command(job), at_s=5.0)),
            ("partial line", watch_records(wait_command(job), text="status=exited code=0 (still polling)")),
        ):
            with self.subTest(label):
                run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [job]}, records=records)
                self.assertFalse(analyze.measure(run, {})["long_ok"], label)

    def test_the_watch_survives_a_quoted_path_and_a_leading_cd(self) -> None:
        # A session that quotes the job path or changes directory first waited
        # on the same job; the shell strips the quotes and `cd` runs no helper.
        job = dict(LONG_JOB)
        for label, command in (
            ("quoted", wait_command(job, quote='"')),
            ("after cd", wait_command(job, prefix="cd /x/coding-agent-workdir && ")),
        ):
            with self.subTest(label):
                run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [job]},
                               records=watch_records(command))
                self.assertTrue(analyze.measure(run, {})["long_ok"], label)

    def test_a_soak_job_is_one_that_runs_the_soak(self) -> None:
        shell = {**LONG_JOB, "command": ["bash", "-c", "cd /x && python3 -m unittest tests.test_soak_long -v"]}
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [shell]},
                       records=watch_records(wait_command(shell)))
        self.assertTrue(analyze.measure(run, {})["long_ok"])
        mention = {**LONG_JOB, "command": ["echo", "test_soak_long"]}
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [mention]},
                       records=watch_records(wait_command(mention)))
        m = analyze.measure(run, {})
        self.assertIsNone(m["long_job"])
        self.assertFalse(m["long_ok"])

    def test_a_shell_job_runs_only_the_operand_after_dash_c(self) -> None:
        # `sh -c <command> <argv0> <args...>` runs the operand after -c and
        # nothing else: the words after it become $0 and friends, so a soak
        # command parked there was never executed.
        parked = {**LONG_JOB,
                  "command": ["bash", "-c", "sleep 601", "python3 -m unittest tests.test_soak_long -v"]}
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [parked]},
                       records=watch_records(wait_command(parked)))
        m = analyze.measure(run, {})
        self.assertIsNone(m["long_job"])
        self.assertFalse(m["long_ok"])
        ran = {**LONG_JOB, "command": ["bash", "-c", "python3 -m unittest tests.test_soak_long"]}
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [ran]},
                       records=watch_records(wait_command(ran)))
        self.assertTrue(analyze.measure(run, {})["long_ok"])

    def test_only_a_direct_soak_invocation_the_shell_ran_counts(self) -> None:
        # Two argv shapes can be the soak: a shell running it as its `-c`
        # operand, and a direct `python -m unittest` run. Everything else
        # only carries the soak's words — an option's value the operand scan
        # must step over, a command substitution whose status belongs to the
        # command around it, an argument of another program.
        soak = "python3 -m unittest tests.test_soak_long"
        for label, command, expected in (
            ("forged with || behind an option value",
             ["bash", "-o", "pipefail", "-c", f"true || {soak} -v"], False),
            ("run behind an option value", ["bash", "-o", "pipefail", "-c", soak], True),
            ("inside a command substitution", ["bash", "-c", f"echo $({soak})"], False),
            ("quoted in another program's argument", ["echo", f"a | {soak}"], False),
            ("the direct argv", ["python3", "-m", "unittest", "tests.test_soak_long"], True),
            ("discover over the soak file",
             ["python3", "-m", "unittest", "discover", "-s", "tests", "-p", "test_soak_long.py"], True),
            ("behind an environment prefix",
             ["env", "PYTHONDONTWRITEBYTECODE=1", "python3", "-m", "unittest", "tests.test_soak_long"], True),
            ("a login shell reaching it after cd", ["bash", "-lc", f"cd /x && {soak}"], True),
            ("a shell running a script instead", ["bash", "run-soak.sh"], False),
        ):
            with self.subTest(label):
                job = {**LONG_JOB, "command": command}
                run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [job]},
                               records=watch_records(wait_command(job)))
                m = analyze.measure(run, {})
                self.assertEqual(m["long_job"] is not None, expected, label)
                self.assertEqual(m["long_ok"], expected, label)

    def test_the_soak_must_be_the_command_the_job_s_exit_belongs_to(self) -> None:
        # The record proves only that the job exited 0, so the soak has to be
        # the command that exit belongs to. A soak the shell may have skipped
        # or whose status another command replaced reads the same from here.
        soak = "python3 -m unittest tests.test_soak_long -v"
        for label, command, expected in (
            ("skipped after ||", ["bash", "-c", f"sleep 601; true || {soak}"], False),
            ("reached after ;", ["bash", "-c", f"sleep 601; {soak}"], True),
            ("reached after &&", ["bash", "-c", "cd /x && python3 -m unittest tests.test_soak_long"], True),
            # An accepted false negative: `true` owns the job's exit status,
            # so an exit 0 says nothing about the soak that ran before it.
            ("followed by another command", ["bash", "-c", f"{soak}; true"], False),
            ("the target of a pipe", ["bash", "-c", f"cat names.txt | {soak}"], False),
            ("the direct argv", ["python3", "-m", "unittest", "tests.test_soak_long"], True),
        ):
            with self.subTest(label):
                job = {**LONG_JOB, "command": command}
                run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [job]},
                               records=watch_records(wait_command(job)))
                m = analyze.measure(run, {})
                self.assertEqual(m["long_job"] is not None, expected, label)
                self.assertEqual(m["long_ok"], expected, label)

    def test_a_nested_shell_is_judged_by_the_command_it_runs(self) -> None:
        # `bash -c <operand>` exits with the operand's own status, so a
        # nested shell proves exactly what the command it reached proves;
        # reading the operand as one opaque command counts a soak the inner
        # shell may have jumped over.
        soak = "python3 -m unittest tests.test_soak_long -v"
        for label, command, expected in (
            ("nested", ["bash", "-c", nested(soak, 1)], True),
            ("nested behind ||", ["bash", "-c", nested(f"true || {soak}", 1)], False),
            ("behind ||", ["bash", "-c", f"true || {soak}"], False),
            ("four shells deep", ["bash", "-c", nested(soak, 4)], True),
            # Past the bound the stack is unproven rather than trusted.
            ("five shells deep", ["bash", "-c", nested(soak, 5)], False),
        ):
            with self.subTest(label):
                job = {**LONG_JOB, "command": command}
                run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [job]},
                               records=watch_records(wait_command(job)))
                m = analyze.measure(run, {})
                self.assertEqual(m["long_job"] is not None, expected, label)
                self.assertEqual(m["long_ok"], expected, label)

    def test_a_backgrounded_soak_is_not_what_the_job_s_exit_proves(self) -> None:
        # `&` hands the shell straight to the next command, so the job can
        # exit 0 while the soak is still running or dies with the shell.
        soak = "python3 -m unittest tests.test_soak_long -v"
        for label, command in (
            ("alone", ["bash", "-c", f"{soak} &"]),
            ("after setup", ["bash", "-c", f"sleep 601; {soak} &"]),
            ("inside a nested shell", ["bash", "-c", nested(f"{soak} &", 1)]),
            ("with a command after it", ["bash", "-c", f"{soak} & sleep 601"]),
            ("detached and waited out", ["bash", "-c", f"nohup {soak} & sleep 601"]),
            # An accepted false negative: `nohup` without `&` does wait for
            # the soak, but it is one word away from the shape that does not
            # and the tripwire cannot tell the two apart, so this fails closed.
            ("under nohup in the foreground", ["bash", "-c", f"nohup {soak}"]),
        ):
            with self.subTest(label):
                job = {**LONG_JOB, "command": command}
                run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [job]},
                               records=watch_records(wait_command(job)))
                m = analyze.measure(run, {})
                self.assertIsNone(m["long_job"], label)
                self.assertFalse(m["long_ok"], label)

    def test_a_command_substitution_hides_the_soak_s_exit(self) -> None:
        # `_split_ops` reads a `;` inside `$( )` as a top-level operator, so
        # the fragment after it would pose as the final command while the
        # exit belongs to the command the substitution feeds; any `$(` or
        # backtick in the judged text fails closed instead.
        soak = "python3 -m unittest tests.test_soak_long"
        for label, command in (
            ("a failing soak inside echo's substitution",
             ["bash", "-c", f"sleep 601; echo $(true; {soak}.NoSuch)"]),
            ("the soak as a substitution's whole body", ["bash", "-c", f"echo $({soak})"]),
            ("a backtick substitution", ["bash", "-c", f"sleep 601; echo `true; {soak}`"]),
        ):
            with self.subTest(label):
                job = {**LONG_JOB, "command": command}
                run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [job]},
                               records=watch_records(wait_command(job)))
                m = analyze.measure(run, {})
                self.assertIsNone(m["long_job"], label)
                self.assertFalse(m["long_ok"], label)
        # The watch is read by the same rule: a wait reached through a
        # substitution is a documented false negative, a plain one still answers.
        jobdir = f"jobs/{LONG_JOB['name']}-x-0"
        self.assertIsNone(analyze._waited_job(f"cd $(pwd) && {TRACKED_JOB} wait {jobdir} --max-ms 600000"))
        self.assertEqual(analyze._waited_job(f"{TRACKED_JOB} wait {jobdir} --max-ms 600000"), jobdir)

    def test_the_wait_must_be_the_last_thing_the_call_runs(self) -> None:
        # The call's output is the proof, so it has to be the helper's own
        # answer: anything running after the wait can print over it.
        job = dict(LONG_JOB)
        jobdir = f"jobs/{job['name']}-x-0"
        for label, command, text in (
            ("a success line forged after a one-millisecond wait",
             f"{TRACKED_JOB} wait {jobdir} --max-ms 1; sleep 601; echo status=exited code=0", WAIT_OK),
            ("a success line printed before the real answer",
             f"echo status=exited code=0; {TRACKED_JOB} wait {jobdir} --max-ms 600000",
             "status=exited code=0\nstatus=running\n"),
            ("piped into another command",
             f"{TRACKED_JOB} wait {jobdir} --max-ms 600000 | tee wait.log", WAIT_OK),
        ):
            with self.subTest(label):
                run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [job]},
                               records=watch_records(command, text=text))
                self.assertFalse(analyze.measure(run, {})["long_ok"], label)

    def test_the_wait_must_run_whatever_it_follows(self) -> None:
        # `||` runs its right side only when the left side failed, so the
        # call exiting 0 cannot tell a wait that ran from one the shell
        # jumped over; `;` and `&&` reach their right side either way.
        job = dict(LONG_JOB)
        wait = f"{TRACKED_JOB} wait jobs/{job['name']}-x-0 --max-ms 600000"
        for label, command, expected in (
            ("skipped behind a forged status line", f"echo status=exited code=0; true || {wait}", False),
            # An accepted false negative: this wait did run, and its own
            # verdict is the result, but `false || ` is the shape a forgery
            # hides in and the exit status cannot separate the two.
            ("after ||", f"false || {wait}", False),
            ("after a newline continuing ||", f"true ||\n{wait}", False),
            ("after &&", f"cd /x/coding-agent-workdir && {wait}", True),
        ):
            with self.subTest(label):
                run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [job]},
                               records=watch_records(command))
                self.assertEqual(analyze.measure(run, {})["long_ok"], expected, label)

    def test_the_verdict_is_the_last_line_the_wait_printed(self) -> None:
        job = dict(LONG_JOB)
        for label, text in (
            ("after the helper's own note", "job soak-long exited code=0\nstatus=exited code=0\n"),
            ("followed only by blank lines", "status=exited code=0\n\n   \n"),
        ):
            with self.subTest(label):
                run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [job]},
                               records=watch_records(wait_command(job), text=text))
                self.assertTrue(analyze.measure(run, {})["long_ok"], label)

    def test_the_watched_attempt_answers_for_a_retried_soak(self) -> None:
        # A lost first attempt and a watched retry are two records of one
        # obligation; H4 asks about the attempt the session actually watched.
        lost = {**LONG_JOB, "state": "lost"}
        retry = dict(LONG_JOB)
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [lost, retry]},
                       records=watch_records(wait_command(retry, index=1)))
        m = analyze.measure(run, {})
        self.assertTrue(m["long_ok"])
        self.assertTrue(m["long_job"]["_dir"].endswith("soak-long-x-1"))
        # With neither attempt watched the last one is the state the run ended in.
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [lost, retry]},
                       records=[human(0, "go"), assistant(5, "ok.")])
        m = analyze.measure(run, {})
        self.assertFalse(m["long_ok"])
        self.assertTrue(m["long_job"]["_dir"].endswith("soak-long-x-1"))

    def test_a_verdict_void_keeps_its_kind_when_the_archive_is_also_broken(self) -> None:
        # `void-instrument` is uncapped, so relabelling a capped void would give
        # the campaign a free attempt it has not earned.
        run = make_run(final="indeterminate",
                       gauntlet={"status": "investigate", "run_id": "r1",
                                 "summary": "gauntlet exited (status 1) without writing a result"},
                       workspace_ledger=ledger_text(done=[1]),
                       extra_workspaces=[{"ledger": ledger_text(done=[2])}])
        m = analyze.measure(run, {})
        self.assertEqual(m["void"], "void-other")
        self.assertIn("2 live workspaces", m["void_detail"])

    def test_live_shell_turn_ends_count_only_shells(self) -> None:
        run = make_run(records=turn_end_with_live("shell"))
        self.assertEqual(len(analyze.measure(run, {})["live_shell_turn_ends"]), 1)
        run = make_run(records=turn_end_with_live("agent"))
        self.assertEqual(len(analyze.measure(run, {})["live_shell_turn_ends"]), 0)
        run = make_run(records=turn_end_with_live("both"))
        self.assertEqual(len(analyze.measure(run, {})["live_shell_turn_ends"]), 0)

    def test_an_abandoned_shell_is_a_live_shell_turn_end(self) -> None:
        # The session walked away and never saw the shell finish, which is the
        # H4 failure; `state_at` would call that moment censored.
        run = make_run(records=turn_end_with_live("shell", complete=False))
        self.assertEqual(len(analyze.measure(run, {})["live_shell_turn_ends"]), 1)
        run = make_run(records=turn_end_with_live("both", complete=False))
        self.assertEqual(len(analyze.measure(run, {})["live_shell_turn_ends"]), 0)

    def test_an_abandoned_shell_at_the_end_of_the_transcript_counts(self) -> None:
        recs = [human(0, "go"),
                assistant(20, tools=[("b1", "Bash", {"command": "sleep 900", "run_in_background": True})]),
                result(21, "b1", BASH_BG),
                assistant(30, "The soak is running; I will check it later.")]
        run = make_run(records=recs)
        self.assertEqual(len(analyze.measure(run, {})["live_shell_turn_ends"]), 1)

    def test_a_reload_clears_the_launches_it_ended(self) -> None:
        # A reload ends the session that owned the launch, so the shell is not
        # still running at the next turn end, and the agent the reload killed
        # does not keep a later shell-only stop from counting.
        def after_reload(*tail: dict[str, Any]) -> list[dict[str, Any]]:
            return [human(0, "go"),
                    assistant(10, tools=[("b1", "Bash", {"command": "sleep 900", "run_in_background": True})]),
                    result(11, "b1", BASH_BG),
                    result(50, "z9", RELOAD_RESULT, is_error=True),
                    assistant(51, "No response requested."),
                    human(60, "Resume"),
                    *tail]

        quiet = after_reload(assistant(70, tools=[("t1", "Bash", {"command": "ls"})]),
                             result(71, "t1", "ok"),
                             assistant(80, "Nothing is running now."),
                             human(200, "continue"))
        self.assertEqual(analyze.measure(make_run(records=quiet), {})["live_shell_turn_ends"], [])
        relaunched = after_reload(
            assistant(70, tools=[("b2", "Bash", {"command": "sleep 900", "run_in_background": True})]),
            result(71, "b2", BASH_BG),
            assistant(80, "The soak is running in the background."),
            human(200, "continue"),
            notification(400, "b2"))
        self.assertEqual(len(analyze.measure(make_run(records=relaunched), {})["live_shell_turn_ends"]), 1)

    def test_an_agent_a_reload_ended_does_not_mask_a_live_shell(self) -> None:
        recs = [human(0, "go"),
                assistant(10, tools=[("a1", "Agent", {"description": "Implement Task 1"})]),
                result(11, "a1", AGENT_BG),
                result(50, "z9", RELOAD_RESULT, is_error=True),
                assistant(51, "No response requested."),
                human(60, "Resume"),
                assistant(70, tools=[("b1", "Bash", {"command": "sleep 900", "run_in_background": True})]),
                result(71, "b1", BASH_BG),
                assistant(80, "The soak is running in the background."),
                human(300, "continue"),
                notification(400, "b1")]
        self.assertEqual(len(analyze.measure(make_run(records=recs), {})["live_shell_turn_ends"]), 1)


def grading(run: Path, name: str, stops: list[tuple[str, str]]) -> Path:
    """Another Gauntlet grading directory beside the one ``make_run`` writes."""
    out = run / "gauntlet-agent" / "results" / name
    out.mkdir(parents=True, exist_ok=True)
    evidence = "\n".join(f'STOP: "{quote}" | {label}' for quote, label in stops)
    (out / "result.json").write_text(json.dumps({
        "status": "pass",
        "criteria": [{"criterion": "Mid-plan stops are listed", "verdict": "pass", "evidence": evidence}],
    }))
    return out


class Readers(unittest.TestCase):
    def test_receipt_for_picks_the_newest_receipt_carrying_the_session_and_skips_unfinished_staging(self) -> None:
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "name": "p-20261023T100000Z"},
                       extra_receipts=[{"ledger": ledger_text(done=[1]), "name": "p-20261023T090000Z"},
                                       {"ledger": ledger_text(done=[1], sid="other"), "name": "p-20261023T110000Z"},
                                       {"ledger": ledger_text(done=[1]), "name": ".staging-p-20261023T120000Z"}])
        ws = analyze.workspace_of(run)
        self.assertEqual(analyze.receipt_for(ws, "sess-1").name, "p-20261023T100000Z")  # type: ignore[union-attr]
        self.assertIsNone(analyze.receipt_for(ws, "nobody"))
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "name": "p-20261023T100000Z"},
                       extra_receipts=[{"ledger": ledger_text(done=[1]), "name": ".staging-p-20261023T130000Z", "finished": True}])
        self.assertEqual(analyze.receipt_for(analyze.workspace_of(run), "sess-1").name, ".staging-p-20261023T130000Z")  # type: ignore[union-attr]

    def test_live_workspace_for_needs_exactly_one_ledger_with_the_session(self) -> None:
        run = make_run(workspace_ledger=ledger_text(done=[1]), extra_workspaces=[{"ledger": ledger_text(done=[2], sid="other")}])
        self.assertIsNotNone(analyze.live_workspace_for(analyze.workspace_of(run), "sess-1"))
        self.assertIsNone(analyze.live_workspace_for(analyze.workspace_of(run), "nobody"))
        run = make_run(workspace_ledger=ledger_text(done=[1]), extra_workspaces=[{"ledger": ledger_text(done=[2])}])
        with self.assertRaises(analyze.ArtifactError):
            analyze.live_workspace_for(analyze.workspace_of(run), "sess-1")

    def test_live_workspace_for_skips_the_lifecycle_copies_of_one_workspace(self) -> None:
        # finish's tomb and import's two copies each hold the whole ledger, this
        # session's line included; the hook skips them by name and so must this.
        run = make_run(workspace_ledger=ledger_text(done=[1]), extra_workspaces=[
            {"ledger": ledger_text(done=[1]), "name": ".removing-p-4321"},
            {"ledger": ledger_text(done=[1]), "name": "p.import-4321"},
            {"ledger": ledger_text(done=[1]), "name": "p.importing-4321"},
        ])
        live = analyze.live_workspace_for(analyze.workspace_of(run), "sess-1")
        self.assertIsNotNone(live)
        self.assertEqual(live.name, "p")  # type: ignore[union-attr]

    def test_an_imported_workspace_reached_by_two_paths_is_one_workspace(self) -> None:
        # sdd-state's import leaves the plain-cache path a symlink to the state
        # path, so one ledger answers twice unless the match is by real path.
        run = make_run(workspace_ledger=ledger_text(done=[1]))
        ws = analyze.workspace_of(run)
        state = ws / "home" / ".cache" / "hyperpowers" / "state" / "k" / "plans" / "p"
        plain = ws / "home" / ".cache" / "hyperpowers" / "sdd" / "k" / "plans" / "imported"
        plain.parent.mkdir(parents=True, exist_ok=True)
        plain.symlink_to(state, target_is_directory=True)
        live = analyze.live_workspace_for(ws, "sess-1")
        self.assertIsNotNone(live)
        self.assertEqual(live.resolve(), state.resolve())  # type: ignore[union-attr]

    def test_an_import_alias_copied_into_an_archive_does_not_compete(self) -> None:
        # `cp -Rp` keeps the absolute symlink sdd-state's import left, so in the
        # archive the alias still points at the source run while its target was
        # copied in: two paths that do not resolve to one, carrying one session.
        run = make_run(workspace_ledger=ledger_text(done=[1]))
        ws = analyze.workspace_of(run)
        plans = ws / "home" / ".cache" / "hyperpowers"
        (plans / "sdd" / "k" / "plans").mkdir(parents=True, exist_ok=True)
        (plans / "sdd" / "k" / "plans" / "imported").symlink_to(
            plans / "state" / "k" / "plans" / "p", target_is_directory=True)
        with tempfile.TemporaryDirectory() as tmp:
            archived = Path(tmp) / "workspaces" / "r1"
            shutil.copytree(ws, archived, symlinks=True)
            alias = archived / "home" / ".cache" / "hyperpowers" / "sdd" / "k" / "plans" / "imported"
            self.assertFalse(str(alias.resolve()).startswith(str(archived)), "the fixture must keep the alias absolute")
            self.assertEqual(
                analyze.live_workspace_for(archived, "sess-1"),
                archived / "home" / ".cache" / "hyperpowers" / "state" / "k" / "plans" / "p",
            )

    def test_a_retry_suffix_outranks_the_name_it_fell_from_and_a_pid_does_not(self) -> None:
        # Two finishes of one second: the second falls to `-2`, so it is the
        # later; a staging that took a private `-<pid>` name is not a retry.
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "name": "p-20261023T100000Z"},
                       extra_receipts=[{"ledger": ledger_text(done=[1]), "name": "p-20261023T100000Z-2"},
                                       {"ledger": ledger_text(done=[1]), "name": ".staging-p-20261023T100000Z-94144",
                                        "finished": True}])
        ws = analyze.workspace_of(run)
        self.assertEqual(analyze.receipt_for(ws, "sess-1").name, "p-20261023T100000Z-2")  # type: ignore[union-attr]

    def test_a_job_record_that_is_not_an_object_is_skipped(self) -> None:
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [{"name": "soak", "state": "exited", "code": 0}]})
        receipt = analyze.receipt_for(analyze.workspace_of(run), "sess-1")
        assert receipt is not None
        for name, text in (("broken-x-8", "[1, 2]"), ("torn-x-9", '{"name": "torn"')):
            jobdir = receipt / "jobs" / name
            jobdir.mkdir(parents=True)
            (jobdir / "meta.json").write_text(text)
        self.assertEqual([j["name"] for j in analyze.jobs_for(receipt, None)], ["soak"])

    def test_decisions_are_the_union_by_timestamp_and_session(self) -> None:
        a = line("2026-10-23T10:05:00.000Z", "block", "open-tasks", refusals=1)
        b = line("2026-10-23T10:06:00.000Z", "allow", "handback-text")
        c = line("2026-10-23T10:07:00.000Z", "block", "open-tasks", refusals=1)
        d = line("2026-10-23T11:00:00.000Z", "allow", "no-ledger", plan=None)  # after Finish: mirror only
        other = line("2026-10-23T10:05:30.000Z", "block", "open-tasks", session="stranger")
        # the mirror lost a middle line (b) and its final line (c); the receipt has them; the mirror alone has d
        run = make_run(receipt={"ledger": ledger_text(done=[1, 2, 3, 4, 5, 6]), "log": [a, b, c]}, mirror=[a, other, d])
        ws = analyze.workspace_of(run)
        decisions, conflicts = analyze.decisions_for(ws, analyze.receipt_for(ws, "sess-1"), None, "sess-1")
        self.assertEqual([x["reason"] for x in decisions], ["open-tasks", "handback-text", "open-tasks", "no-ledger"])
        self.assertEqual(conflicts, [])

    def test_two_payloads_under_one_key_are_a_conflict(self) -> None:
        a = line("2026-10-23T10:05:00.000Z", "block", "open-tasks", refusals=1)
        a2 = {**a, "reason": "live-shell"}
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "log": [a]}, mirror=[a2])
        ws = analyze.workspace_of(run)
        decisions, conflicts = analyze.decisions_for(ws, analyze.receipt_for(ws, "sess-1"), None, "sess-1")
        self.assertEqual(len(decisions), 1)
        self.assertEqual([(x["reason"], y["reason"]) for x, y in conflicts], [("open-tasks", "live-shell")])

    def test_mirror_only_lines_reconcile_under_the_same_key_as_the_rest(self) -> None:
        # The pre-registered rule keys the whole union: the bash wrapper's
        # hook-error lines are mirror-only and carry whole-second timestamps, so
        # two of them in one second are one decision when identical and a
        # conflict when not. Task 9's design accepts that residual.
        logged = line("2026-10-23T10:05:00.000Z", "block", "open-tasks", refusals=1)
        first = line("2026-10-23T10:06:00Z", "allow", "hook-error", plan=None, detail="node not found")
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "log": [logged]},
                       mirror=[logged, first, dict(first)])
        ws = analyze.workspace_of(run)
        decisions, conflicts = analyze.decisions_for(ws, analyze.receipt_for(ws, "sess-1"), None, "sess-1")
        self.assertEqual([x["reason"] for x in decisions], ["open-tasks", "hook-error"])
        self.assertEqual(conflicts, [])
        second = {**first, "detail": "module failed"}
        run = make_run(receipt={"ledger": ledger_text(done=[1])}, mirror=[first, second])
        ws = analyze.workspace_of(run)
        decisions, conflicts = analyze.decisions_for(ws, analyze.receipt_for(ws, "sess-1"), None, "sess-1")
        self.assertEqual(len(decisions), 1)
        self.assertEqual([(x.get("detail"), y.get("detail")) for x, y in conflicts],
                         [("node not found", "module failed")])

    def test_an_unfinished_run_reads_the_live_workspace_log_and_jobs(self) -> None:
        a = line("2026-10-23T10:05:00.000Z", "block", "open-tasks", refusals=1)
        run = make_run(workspace_ledger=ledger_text(done=[1]), workspace_log=[a], workspace_jobs=[{"name": "soak", "state": "running"}])
        ws = analyze.workspace_of(run)
        live = analyze.live_workspace_for(ws, "sess-1")
        decisions, _ = analyze.decisions_for(ws, None, live, "sess-1")
        self.assertEqual([x["reason"] for x in decisions], ["open-tasks"])
        self.assertEqual([j["name"] for j in analyze.jobs_for(None, live)], ["soak"])
        self.assertEqual(analyze.ledger_tasks_from(analyze.ledger_text_for(None, live)), {1})
        self.assertEqual(analyze.plan_path_from(analyze.ledger_text_for(None, live)), "plan.md")

    def test_jobs_come_from_the_receipt_when_there_is_one(self) -> None:
        run = make_run(receipt={"ledger": ledger_text(done=[1]), "jobs": [{"name": "soak", "state": "exited", "code": 0}]},
                       workspace_ledger=ledger_text(done=[1], sid="stale"), workspace_jobs=[{"name": "stale", "state": "lost"}])
        ws = analyze.workspace_of(run)
        jobs = analyze.jobs_for(analyze.receipt_for(ws, "sess-1"), None)
        self.assertEqual([(j["name"], j["state"]) for j in jobs], [("soak", "exited")])
        self.assertTrue(jobs[0]["_dir"].endswith("soak-x-0"))

    def test_stop_times_come_from_the_main_transcript_in_order(self) -> None:
        recs = [human(0, "go"), assistant(10, "Task 1 done. Moving to Task 2."), human(100, "continue"),
                assistant(110, "Which option do you want?"), human(200, "Task 1 governs"),
                assistant(210, "Task 1 done. Moving to Task 2."), human(300, "continue"), assistant(310, "All done.")]
        stops = [("Task 1 done. Moving to Task 2.", "neither"), ("Which option do you want?", "question"),
                 ("Task 1 done. Moving to Task 2.", "neither"), ("never said", "neither")]
        timed = analyze.stop_times(stops, recs)
        self.assertEqual([t for _, _, t in timed], [parse_ts(at(10)), parse_ts(at(110)), parse_ts(at(210)), None])

    def test_two_identical_listed_stops_stay_two_stops(self) -> None:
        # The Gauntlet lists one entry per stop, so two stops that quote one
        # sentence are two stops, each owed its own allow; collapsing them would
        # hide the second's missing decision from the one-to-one match.
        recs = [human(0, "go"), assistant(10, "Task 1 done. Moving to Task 2."), human(100, "continue"),
                assistant(110, "Task 1 done. Moving to Task 2."), human(200, "continue"), assistant(210, "All done.")]
        quoted = ("Task 1 done. Moving to Task 2.", "neither")
        allow = line(at(12), "allow", "handback-text")
        run = make_run(records=recs, stops=[quoted, quoted],
                       receipt={"ledger": ledger_text(done=[1]), "log": [allow]})
        listed = analyze.stop_lines(run)
        self.assertEqual(listed, [("task 1 done. moving to task 2", "neither")] * 2)
        timed = analyze.stop_times(listed, recs)
        self.assertEqual([t for _, _, t in timed], [parse_ts(at(10)), parse_ts(at(110))])
        # One allow for two stops: the second stop has no decision to pair with,
        # which is what Task 15's matcher reports as void-instrument.
        ws = analyze.workspace_of(run)
        decisions, _ = analyze.decisions_for(ws, analyze.receipt_for(ws, "sess-1"), None, "sess-1")
        self.assertEqual(len(decisions), 1)

    def test_a_result_rendered_twice_lists_its_stops_once(self) -> None:
        run = make_run(stops=[("Which option do you want?", "question")])
        results = next((run / "gauntlet-agent" / "results").iterdir())
        (results / "result.md").write_text('STOP: "Which option do you want?" | question\n')
        self.assertEqual(analyze.stop_lines(run), [("which option do you want?", "question")])

    def test_only_the_stops_criterion_lists_stops(self) -> None:
        # The grader's prose quotes the form it was asked for; those sentences
        # are not stops the run made.
        run = make_run(stops=[("Which option do you want?", "question")])
        results = next((run / "gauntlet-agent" / "results").iterdir())
        verdict = json.loads((results / "result.json").read_text())
        verdict["reasoning"] = (
            'I looked for lines such as STOP: "an example the agent never said" | neither and\n'
            'STOP: "another example" | blocked before settling the list.'
        )
        verdict["criteria"].insert(0, {"criterion": "Agent invoked the skill", "verdict": "pass",
                                       "evidence": 'the log shows STOP: "a third example" | neither quoted back'})
        (results / "result.json").write_text(json.dumps(verdict))
        self.assertEqual(analyze.stop_lines(run), [("which option do you want?", "question")])

    def test_the_grader_s_wording_of_the_stops_criterion_still_matches(self) -> None:
        for wording in ("Mid-plan stops listed", "Mid-plan stops are listed", "List of mid-plan stops"):
            run = make_run(stops=[("Which option do you want?", "question")])
            results = next((run / "gauntlet-agent" / "results").iterdir())
            verdict = json.loads((results / "result.json").read_text())
            verdict["criteria"][0]["criterion"] = wording
            (results / "result.json").write_text(json.dumps(verdict))
            self.assertEqual(analyze.stop_lines(run), [("which option do you want?", "question")], wording)

    def test_the_markdown_rendering_answers_only_without_the_structured_one(self) -> None:
        run = make_run(stops=[("Which option do you want?", "question")])
        results = next((run / "gauntlet-agent" / "results").iterdir())
        (results / "result.md").write_text('STOP: "Task 1 done. Moving on." | neither\n')
        self.assertEqual(analyze.stop_lines(run), [("which option do you want?", "question")])
        (results / "result.json").unlink()
        self.assertEqual(analyze.stop_lines(run), [("task 1 done. moving on", "neither")])

    def test_only_the_grading_the_verdict_names_lists_stops(self) -> None:
        # Quorum grades one results directory and records its name, so a stale
        # or retried grading beside it graded nothing and its entries are not
        # stops the run made. "r2" sorts after the canonical "r1", so a
        # newest-wins rule would answer with the wrong directory here.
        run = make_run(stops=[("Which option do you want?", "question")])
        grading(run, "r2", [("Task 1 done. Moving on.", "neither")])
        self.assertEqual(analyze.stop_lines(run), [("which option do you want?", "question")])

    def test_a_verdict_without_a_run_id_takes_the_newest_grading(self) -> None:
        # A verdict archived before quorum recorded the name leaves only
        # quorum's own rule: the newest directory that graded.
        run = make_run(stops=[("Which option do you want?", "question")], gauntlet={"status": "pass", "summary": "ok"})
        grading(run, "r2", [("Task 1 done. Moving on.", "neither")])
        self.assertEqual(analyze.stop_lines(run), [("task 1 done. moving on", "neither")])

    def test_a_verdict_without_a_run_id_skips_an_unparseable_newest_grading(self) -> None:
        # Quorum skips a directory whose result.json does not parse and grades
        # the next one down; the skipped directory's rendering is skipped with
        # it, since quorum never read that grading at all.
        run = make_run(stops=[("Which option do you want?", "question")], gauntlet={"status": "pass", "summary": "ok"})
        stale = grading(run, "r2", [("Task 1 done. Moving on.", "neither")])
        (stale / "result.json").write_text("{not json")
        (stale / "result.md").write_text('STOP: "Task 1 done. Moving on." | neither\n')
        self.assertEqual(analyze.stop_lines(run), [("which option do you want?", "question")])

    def test_adjudications_carry_this_campaign_s_labels(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "adjudications.tsv"
            path.write_text(
                "# run_id\tts\tlabel\tnote\n"
                "r1\t2026-10-23T10:05:00.000Z\thandback\tthe reviewer asked a question\n"
                "r1\t2026-10-23T10:07:00.000Z\tneither\tit had the next step in hand\n"
                "r1\t2026-10-23T10:09:00.000Z\tnonsense\tnot a label\n"
                "\n"
            )
            self.assertEqual(
                analyze.read_adjudications(path),
                {("r1", "2026-10-23T10:05:00.000Z"): "handback", ("r1", "2026-10-23T10:07:00.000Z"): "neither"},
            )
        self.assertEqual(analyze.read_adjudications(Path(tmp) / "gone.tsv"), {})

    def test_the_session_id_is_the_transcript_name_and_a_torn_write_is_not_a_record(self) -> None:
        run = make_run(sid="sess-2", receipt={"ledger": ledger_text(done=[1], sid="sess-2")})
        ws = analyze.workspace_of(run)
        transcript = analyze.main_transcript(ws)
        self.assertIsNotNone(transcript)
        sid = analyze.session_id(transcript)  # type: ignore[arg-type]
        self.assertEqual(sid, "sess-2")
        self.assertIsNotNone(analyze.receipt_for(ws, sid))
        # A write that failed part-way leaves an unterminated tail, and the next
        # append fences it; neither line is a record, however it reads.
        torn = ledger_text(done=[1]) + "Task 2: complete (commits 0000002..0000003, rev"
        self.assertEqual(analyze.ledger_tasks_from(torn), {1})
        fenced = ledger_text(done=[1]) + "Task 2: complete (commits 0000002..0000003, rev\t#fragment\n"
        self.assertEqual(analyze.ledger_tasks_from(fenced), {1})
        self.assertIsNone(analyze.plan_path_from("# SDD ledger — plan: plan.md"))
        # The writers break a ledger on the newline byte alone, so a carriage
        # return inside a line makes neither a second record nor a second claim.
        returns = ledger_text(done=[1]) + "Task 2: complete (abc)\rTask 3: complete (commits 0000003..0000"
        self.assertEqual(analyze.ledger_tasks_from(returns), {1})
        claimed = make_run(workspace_ledger=ledger_text(done=[1]) + "note: resumed\rsession other-1: mode worktree\n")
        ws = analyze.workspace_of(claimed)
        self.assertIsNotNone(analyze.live_workspace_for(ws, "sess-1"))
        self.assertIsNone(analyze.live_workspace_for(ws, "other-1"))

    def test_a_malformed_decision_line_is_skipped_not_fatal(self) -> None:
        good = line("2026-10-23T10:05:00.000Z", "block", "open-tasks", refusals=1)
        naive = line("2026-10-23T10:06:00", "allow", "handback-text")
        run = make_run(receipt={"ledger": ledger_text(done=[1]),
                                "log": [good, naive, {"ts": "2026-10-23T10:07:00.000Z", "session": "sess-1"}]})
        ws = analyze.workspace_of(run)
        log = analyze.receipt_for(ws, "sess-1")
        assert log is not None
        (log / "stop-guard.jsonl").write_text(
            (log / "stop-guard.jsonl").read_text() + "{not json\n" + json.dumps(good) + "\n{\"ts\""
        )
        decisions, conflicts = analyze.decisions_for(ws, log, None, "sess-1")
        self.assertEqual([x["reason"] for x in decisions], ["open-tasks"])
        self.assertEqual(conflicts, [])


class Untracked(unittest.TestCase):
    def test_shell_spellings(self) -> None:
        cases = [
            ("python3 -m unittest tests.test_soak_long -v > out 2>&1", False),
            ("sleep 100 &", True),
            ("make && make test", False),
            ("nohup python3 x.py > o 2>&1", True),
            ("echo 'nohup sleep &'", False),
            ("cat > s.sh <<'EOF'\nnohup sleep 9 &\nEOF", False),
            ("python3 -c 'import subprocess; subprocess.Popen([\"x\"], start_new_session=True)'", True),
            ("setsid python3 x.py", True),
            ("grep -n setsid notes.md", False),
            ("ls &>/dev/null", False),
            ("cmd; disown", True),
        ]
        for command, expected in cases:
            with self.subTest(command=command):
                self.assertEqual(analyze.shell_detaches(command), expected)

    def test_executed_session_written_scripts_are_flagged(self) -> None:
        records = treatment_records()
        records += [
            assistant(2000, tools=[("w1", "Write", {"file_path": "/nowhere/run.sh", "content": "nohup sleep 1 &\n"})]),
            result(2001, "w1", "written"),
            assistant(2002, tools=[("w2", "Bash", {"command": "bash /nowhere/run.sh"})]),
            result(2003, "w2", ""),
            assistant(2010, tools=[("w3", "Bash", {"command": "cat > /nowhere/go.sh <<'EOF'\nsetsid sleep 5\nEOF"})]),
            result(2011, "w3", ""),
            assistant(2012, tools=[("w4", "Bash", {"command": "sh /nowhere/go.sh"})]),
            result(2013, "w4", ""),
            assistant(2020, tools=[("w5", "Write", {"file_path": "/nowhere/idle.sh", "content": "nohup sleep 1 &\n"})]),
            result(2021, "w5", "written"),
            assistant(2030, tools=[("w6", "Bash", {"command": "printf 'nohup sleep 2 &\\n' > /nowhere/r.sh"})]),
            result(2031, "w6", ""),
            assistant(2032, tools=[("w7", "Bash", {"command": "bash /nowhere/r.sh"})]),
            result(2033, "w7", ""),
            assistant(2040, tools=[("w8", "Edit", {"file_path": "/x/coding-agent-workdir/tools/e.sh", "old_string": "a", "new_string": "b"})]),
            result(2041, "w8", "edited"),
            assistant(2042, tools=[("w9", "Bash", {"command": "sh tools/e.sh"})]),
            result(2043, "w9", ""),
            assistant(2044, tools=[("wt", "Write", {"file_path": "/nowhere/t.sh", "content": "echo hi\n"})]),
            result(2045, "wt", "written"),
            assistant(2046, tools=[("we", "Edit", {"file_path": "/nowhere/t.sh", "old_string": "echo hi", "new_string": "nohup sleep 1 &"})]),
            result(2047, "we", "edited"),
            assistant(2048, tools=[("wx", "Bash", {"command": "bash /nowhere/t.sh"})]),
            result(2049, "wx", ""),
            assistant(2050, tools=[("wa", "Bash", {"command": "bash -c 'nohup sleep 9 &'"})]),
            result(2051, "wa", ""),
            assistant(2060, tools=[("wb", "Bash", {"command": "cat > /nowhere/inline.sh <<'EOF'\nnohup sleep 7 &\nEOF\nbash /nowhere/inline.sh"})]),
            result(2061, "wb", ""),
            assistant(2062, tools=[("wc", "Bash", {"command": "printf 'setsid sleep 1\\n' > /nowhere/r2.sh && sh /nowhere/r2.sh"})]),
            result(2063, "wc", ""),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            record = make_run(Path(tmp), "t9", records, plugin_dir="/roots/treatment")
            edited = Path(tmp) / "workspaces" / "t9" / "coding-agent-workdir" / "tools" / "e.sh"
            edited.parent.mkdir(parents=True)
            edited.write_text("setsid sleep 3\n")
            found = analyze.measure(record, {})["untracked"]
        files = sorted(u["detail"] for u in found if u["where"] == "file")
        self.assertEqual(
            files,
            [
                "/nowhere/go.sh",
                "/nowhere/inline.sh",
                "/nowhere/r.sh",
                "/nowhere/r2.sh",
                "/nowhere/run.sh",
                "/nowhere/t.sh",
                "/x/coding-agent-workdir/tools/e.sh",
            ],
        )
        self.assertEqual([u["detail"] for u in found if u["where"] == "command"], ["bash -c 'nohup sleep 9 &'"])

    def test_soak_execution_matching(self) -> None:
        self.assertTrue(analyze.runs_soak("python3 -m unittest tests.test_soak_short -v", "test_soak_short"))
        self.assertTrue(analyze.runs_soak("python3 -m unittest discover -s tests", "test_soak_long"))
        self.assertFalse(analyze.runs_soak('python3 -m unittest discover -s tests -p "test_unit_*.py"', "test_soak_long"))
        self.assertFalse(analyze.runs_soak("grep test_soak_short plan.md", "test_soak_short"))
        self.assertFalse(analyze.runs_soak('grep -n "unittest tests.test_soak_long" plan.md', "test_soak_long"))
        self.assertFalse(analyze.runs_soak('git commit -m "run python3 -m unittest tests.test_soak_short"', "test_soak_short"))
        self.assertTrue(analyze.runs_soak("cd /x && PYTHONPATH=. python3 -m unittest tests.test_soak_long -v", "test_soak_long"))
        self.assertTrue(analyze.runs_soak("nohup python3 -m unittest tests.test_soak_long -v > o 2>&1 &", "test_soak_long"))


class Summary(unittest.TestCase):
    def test_transcript_summary_counts_the_dispatches_and_the_waits(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = write(Path(tmp) / "s.jsonl", control_records())
            summary = analyze.transcript_summary(path)
        self.assertEqual((summary["dispatch_fg"], summary["dispatch_bg"]), (0, 2))
        self.assertEqual(summary["live_turn_ends"], 1)
        self.assertEqual(summary["censored_stops"], 0)
        self.assertEqual(summary["untracked"], 1)


if __name__ == "__main__":
    unittest.main()
