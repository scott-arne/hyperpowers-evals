"""Tests for tally.py on a synthetic one-arm campaign."""

from __future__ import annotations

import contextlib
import io
import subprocess
import sys
import tempfile
import unittest
from collections.abc import Sequence
from pathlib import Path
from typing import Any
from unittest import mock

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import tally
from synth import assistant, at, ledger_text, line, make_run, result, treatment_records

ARM = "treatment"
ROOT = "/roots/treatment"
SHA = "t" * 40
PINS = {
    "harness": "e" * 40, "treatment": SHA, "treatment_root": ROOT, "model": "claude-opus-5-5",
    "cc": "2.1.300", "cc_path": "/usr/local/bin/claude", "provider": "vertex",
    "subagent_models": "claude-opus-5-5,claude-sonnet-5-5,claude-haiku-5-5",
    "codex": "absent", "task_tools": "on",
}
# The job runs on the records' own timeline: treatment_records launches the
# long soak at 600 s and its completion lands at 1330 s, and the watch below
# has to start after the launch and answer after the exit to count.
LONG_JOB = {
    "name": "soak-long", "state": "exited", "code": 0,
    "command": ["python3", "-m", "unittest", "tests.test_soak_long", "-v"],
    "launched": at(600), "ended": at(1330),
}
TRACKED_JOB = f"bash {ROOT}/skills/subagent-driven-development/scripts/tracked-job"
# The clean run's one turn end, and the window its decision has to fall in.
LAST_TEXT = "The long soak exited 0."
LAST_END = 2510.0
ALLOW_TS = at(1920)
# A verdict the Gauntlet-Agent errored out of: a void the cap counts.
CAPPED_VOID = {"final": "indeterminate", "gauntlet": {"status": "investigate", "summary": "harness error"}}
# Two live workspaces claim the session, so `analyze.measure` cannot say
# whose records are the run's and names the void itself.
TWO_WORKSPACES = {"workspace_ledger": ledger_text(done=[1]),
                  "extra_workspaces": [{"ledger": ledger_text(done=[2])}]}
STOP_ALLOW_TS = at(LAST_END + 5)


def clean_records(version: str = "2.1.300") -> list[dict[str, Any]]:
    """A treatment run that also watches the long soak through ``tracked-job wait``.

    The 2026-10-19 fixture waits on the long job with a polling shell, which
    H4 does not accept: this campaign's rule wants the job tracked and watched
    to ``exited code=0``, so the run ends with that watch.
    """
    jobdir = f"jobs/{LONG_JOB['name']}-x-0"
    return treatment_records(version) + [
        assistant(2000, tools=[("w1", "Bash", {"command": f"{TRACKED_JOB} wait {jobdir}", "timeout": 600000})], version=version),
        result(LAST_END - 10, "w1", "status=exited code=0"),
        assistant(LAST_END, LAST_TEXT, version=version),
    ]


def clean_run(**over: Any) -> dict[str, Any]:
    """``make_run`` arguments for a run that meets H1 to H4 and R.

    :param over: any ``make_run`` argument to replace, ``receipt`` included.
    :returns: the arguments, with a receipt carrying the finished ledger, the
        long soak's job record and one decision line naming the plan.
    """
    receipt = {
        "ledger": ledger_text(done=range(1, 7)),
        "jobs": [dict(LONG_JOB)],
        "log": [line(ALLOW_TS, "allow", "live-agent")],
    }
    return {"records": clean_records(), "receipt": receipt, "plugin_dir": ROOT, **over}


def with_log(log: Sequence[dict[str, Any]], **over: Any) -> dict[str, Any]:
    """A clean run whose receipt carries ``log`` as its decision record."""
    kw = clean_run(**over)
    kw["receipt"] = {**kw["receipt"], "log": list(log)}
    return kw


def without_task_tools() -> list[dict[str, Any]]:
    """Clean records with no ``deferred_tools_delta``: the session never got the task tools."""
    return [r for r in clean_records() if r.get("type") != "attachment"]


class Campaign:
    def __init__(self, base: Path, archive: Path | None = None) -> None:
        self.base = base
        # The tally reads archived runs only, so the fixture writes them where
        # `archive-runs.sh` puts them: the record at `<archive>/<run>/` beside
        # `<archive>/workspaces/<run>/`.
        self.archive = base / "task-20-runs" / "treatment" if archive is None else archive
        self.logs = base / "logs"
        self.logs.mkdir(parents=True)
        self.manifest = base / "manifest.tsv"
        self.rows: list[str] = []
        self._write_manifest()

    def _write_manifest(self) -> None:
        self.manifest.write_text("".join(f"{k}\t{v}\n" for k, v in PINS.items()) + "".join(r + "\n" for r in self.rows))

    def declare(self, proc: str) -> None:
        self.rows.append(f"{ARM}\tsdd-turn-liveness\t1\t{proc}\tdefault")
        self._write_manifest()

    def launch(self, proc: str, run_ids: Sequence[str], *, root_clean: str = "yes", cc: str = "2.1.300",
               last: str = "DONE 0", declare: bool = True, preflight: str | None = None,
               after_clean: str | None = None, after_cc: str | None = None, body: Sequence[str] = (),
               harness_pin: str | None = None) -> None:
        """Write a launch log shaped like measure-launch.sh's: header, command, quorum output, footer, last line."""
        if declare:
            self.declare(proc)
        header = [
            f"arm={ARM} scenario=sdd-turn-liveness repeat={len(run_ids)} proc={proc} budget=default",
            f"root={ROOT} root_head={SHA} root_clean={root_clean}",
            f"harness_pin={harness_pin or PINS['harness']} cc_path={PINS['cc_path']} provider=vertex",
            f"model=claude-opus-5-5 cc_before={cc} task_tools=1",
        ]
        if preflight:
            lines = header + [f"preflight={preflight}", "claude is 2.1.299, the pin is 2.1.300", "FAILED preflight"]
        else:
            footer = (
                f"root_after_head={SHA} root_after_clean={after_clean or root_clean} "
                f"cc_after={after_cc or cc} finished=x"
            )
            command = "$ bun run quorum run scenarios/sdd-turn-liveness --coding-agent claude-auto --repeat 1"
            lines = header + [command] + [f"run-id: {r}" for r in run_ids] + list(body) + [footer, last]
        (self.logs / f"{ARM}-sdd-turn-liveness-{proc}.log").write_text("\n".join(lines) + "\n")

    def run(self, run_id: str, proc: str, *, launch: dict[str, Any] | None = None, **run_kw: Any) -> Path:
        """One archived run and the launch log that declares it."""
        record = make_run(self.archive, run_id, **run_kw)
        self.launch(proc, [run_id], **(launch or {}))
        return record

    def runs(self, count: int, first: int = 1, **run_kw: Any) -> None:
        """``count`` clean runs, declared ``p<first>`` onwards."""
        for n in range(first, first + count):
            self.run(f"t{n:02d}", f"p{n}", **clean_run(**run_kw))

    def evaluate(self, adjudications: Path | None = None) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        return tally.evaluate(self.manifest, self.logs, adjudications, self.archive)

    def labels(self, *rows: tuple[str, str, str]) -> Path:
        """An adjudications file holding ``(run_id, ts, label)`` rows."""
        path = self.base / "adjudications.tsv"
        path.write_text("".join(f"{run}\t{ts}\t{label}\tread by hand\n" for run, ts, label in rows))
        return path


class Evaluate(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.c = Campaign(Path(self.tmp.name))

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def status_of(self, run_id: str) -> str:
        rows, _ = self.c.evaluate()
        return str(next(r for r in rows if r["run_id"] == run_id)["status"])

    def test_pass(self) -> None:
        self.c.runs(10)
        _, d = self.c.evaluate()
        self.assertEqual(d["decision"], "PASS")
        self.assertEqual((d["H1"], d["H2"], d["H3"], d["H4"], d["R"]), (True, True, True, True, True))
        self.assertEqual((d["runs_with_plan_decisions"], d["f_runs"], d["success_runs"]), (10, 10, 10))
        self.assertEqual(d["foreground_share"], 1.0)

    def test_h1_fails_when_a_run_has_no_decision_for_its_plan(self) -> None:
        # A `no-ledger` line names no plan, so the hook saw the session but
        # never judged the plan: H1 is about the plan's own lines.
        self.c.runs(9)
        self.c.run("t10", "p10", **with_log([line(ALLOW_TS, "allow", "no-ledger", plan=None)]))
        _, d = self.c.evaluate()
        self.assertEqual(d["runs_with_plan_decisions"], 9)
        self.assertFalse(d["H1"])
        self.assertEqual(d["decision"], "FAIL")

    def test_h2_fails_on_a_listed_stop_the_gauntlet_called_neither(self) -> None:
        # The `cap` allow is adjudicated like a hand-back allow, so it is
        # labelled here to leave the listed `neither` stop as H2's only failure.
        self.c.runs(9)
        self.c.run("t10", "p10", **with_log([line(STOP_ALLOW_TS, "allow", "cap")],
                                            stops=[(LAST_TEXT, "neither")]))
        rows, d = self.c.evaluate(self.c.labels(("t10", STOP_ALLOW_TS, "handback")))
        row = next(r for r in rows if r["run_id"] == "t10")
        self.assertEqual((row["status"], row["unmatched_stops"]), ("counted", []))
        self.assertEqual(d["neither_listed_total"], 1)
        self.assertFalse(d["H2"])
        self.assertEqual(d["decision"], "FAIL")

    def test_h2_fails_on_a_hand_back_allow_the_labeller_calls_neither(self) -> None:
        self.c.runs(9)
        self.c.run("t10", "p10", **with_log([line(ALLOW_TS, "allow", "handback-text")]))
        labels = self.c.labels(("t10", ALLOW_TS, "neither"))
        _, d = self.c.evaluate(labels)
        self.assertEqual((d["false_handbacks_total"], d["unadjudicated_allows_total"]), (1, 0))
        self.assertFalse(d["H2"])
        self.assertEqual(d["decision"], "FAIL")

    def test_an_unlabelled_hand_back_allow_leaves_the_campaign_unadjudicated(self) -> None:
        self.c.runs(9)
        self.c.run("t10", "p10", **with_log([line(ALLOW_TS, "allow", "handback-line")]))
        rows, d = self.c.evaluate()
        self.assertEqual(d["decision"], "UNADJUDICATED")
        self.assertIn("t10", d["reasons"][0])
        # The run stays counted, so the hand labeller can see what is owed.
        self.assertEqual(next(r for r in rows if r["run_id"] == "t10")["status"], "counted")
        labels = self.c.labels(("t10", ALLOW_TS, "handback"))
        self.assertEqual(self.c.evaluate(labels)[1]["decision"], "PASS")

    def test_h2_adjudicates_a_log_failed_allow_that_displaced_a_refusal(self) -> None:
        # The guard had decided to refuse; the plan-log write failed and the
        # hook allowed instead, so that stop reached the human partner with
        # nothing on the Gauntlet's list to say so. H2 has to read it from the
        # run's own record, which leaves the campaign undecided until it is
        # labelled and failing once it is labelled `neither`.
        self.c.runs(9)
        self.c.run("t10", "p10", **with_log([line(ALLOW_TS, "allow", "log-failed",
                                                  detail="open-tasks: 3 of 6 tasks open")]))
        rows, d = self.c.evaluate()
        self.assertEqual(d["decision"], "UNADJUDICATED")
        self.assertEqual(next(r for r in rows if r["run_id"] == "t10")["status"], "counted")
        _, d = self.c.evaluate(self.c.labels(("t10", ALLOW_TS, "neither")))
        self.assertEqual((d["false_handbacks_total"], d["unadjudicated_allows_total"]), (1, 0))
        self.assertFalse(d["H2"])
        self.assertEqual(d["decision"], "FAIL")

    def test_h3_fails_on_a_block_the_labeller_calls_a_hand_back(self) -> None:
        self.c.runs(9)
        self.c.run("t10", "p10", **with_log([line(ALLOW_TS, "block", "open-tasks", refusals=1)]))
        labels = self.c.labels(("t10", ALLOW_TS, "handback"))
        _, d = self.c.evaluate(labels)
        self.assertEqual((d["false_blocks_total"], d["unadjudicated_blocks_total"]), (1, 0))
        self.assertFalse(d["H3"])
        self.assertEqual(d["decision"], "FAIL")

    def test_an_unlabelled_block_leaves_the_campaign_unadjudicated(self) -> None:
        self.c.runs(9)
        self.c.run("t10", "p10", **with_log([line(ALLOW_TS, "block", "open-tasks", refusals=1)]))
        self.assertEqual(self.c.evaluate()[1]["decision"], "UNADJUDICATED")
        labels = self.c.labels(("t10", ALLOW_TS, "neither"))
        self.assertEqual(self.c.evaluate(labels)[1]["decision"], "PASS")

    def test_an_unmatched_listed_stop_is_an_uncapped_instrument_void(self) -> None:
        self.c.runs(9)
        # The Gauntlet listed a stop no decision line answers: nothing says what
        # the hook decided there, so the run is not measurable.
        broken = with_log([], stops=[(LAST_TEXT, "question")])
        self.c.run("t10", "p10", **broken)
        self.assertEqual(self.status_of("t10"), "void-instrument")
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")
        # Four of them, one past the cap of three, still leave the campaign decidable.
        for n in range(2, 5):
            self.c.run(f"t1{n}", f"r{n}", **broken)
        self.c.run("t20", "r1", **clean_run())
        self.assertEqual(self.c.evaluate()[1]["decision"], "PASS")

    def test_a_decision_conflict_is_an_uncapped_instrument_void(self) -> None:
        self.c.runs(9)
        block = line(ALLOW_TS, "block", "open-tasks", refusals=1)
        # One key, two payloads: the logs disagree about what the hook decided.
        broken = with_log([block], mirror=[{**block, "reason": "live-shell"}])
        self.c.run("t10", "p10", **broken)
        self.assertEqual(self.status_of("t10"), "void-instrument")
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")
        for n in range(2, 5):
            self.c.run(f"t1{n}", f"r{n}", **broken)
        self.c.run("t20", "r1", **clean_run())
        self.assertEqual(self.c.evaluate()[1]["decision"], "PASS")

    def test_a_capped_void_keeps_its_kind_when_its_decision_record_is_also_broken(self) -> None:
        # `void-instrument` is uncapped, so promoting a capped void because its
        # record is unreadable too would hand the campaign an attempt it has
        # not earned; `analyze.measure` refuses the same relabelling.
        self.c.runs(10)
        block = line(ALLOW_TS, "block", "open-tasks", refusals=1)
        shapes = (
            with_log([], stops=[(LAST_TEXT, "question")], **CAPPED_VOID),
            with_log([block], mirror=[{**block, "reason": "live-shell"}], **CAPPED_VOID),
        )
        for n in range(4):
            self.c.run(f"t-c{n}", f"r{n + 1}", **shapes[n % 2])
        rows, d = self.c.evaluate()
        voided = [r for r in rows if r["run_id"].startswith("t-c")]
        # Each run carries the instrument failure the guard declines to act on.
        self.assertTrue(all(r["unmatched_stops"] or r["decision_conflicts"] for r in voided))
        self.assertEqual({r["status"] for r in voided}, {"void-other"})
        self.assertEqual(d["decision"], "INCOMPLETE")
        self.assertIn(f"{ARM}: 4 capped voids exceed the cap of 3", d["reasons"])

    def test_runs_that_are_not_archived_yet_block_the_decision(self) -> None:
        # The tally is the decision of record and reads the archive only, so
        # ten valid runs still sitting in the clone's `results/` decide
        # nothing: they are work the campaign has not filed.
        results = self.c.base / "results"
        ids = [f"t{n:02d}" for n in range(1, 11)]
        for n, run_id in enumerate(ids, start=1):
            make_run(results, run_id, **clean_run())
            self.c.launch(f"p{n}", [run_id])
        rows, d = self.c.evaluate()
        self.assertEqual([r["status"] for r in rows], ["unarchived"] * 10)
        self.assertEqual(d["decision"], "INCOMPLETE")
        self.assertIn(f"{ARM}: 10 run(s) not archived: {ids}", d["reasons"])

    def test_bad_provenance_outranks_a_broken_decision_record(self) -> None:
        # `void-instrument` is uncapped and `void-provenance` is not, so asking
        # about the decision record first would let four misconfigured runs
        # walk past the cap.
        self.c.runs(10)
        block = line(ALLOW_TS, "block", "open-tasks", refusals=1)
        elsewhere = {"plugin_dir": "/roots/elsewhere"}
        shapes = (
            with_log([], stops=[(LAST_TEXT, "question")], **elsewhere),
            with_log([block], mirror=[{**block, "reason": "live-shell"}], **elsewhere),
        )
        for n in range(4):
            self.c.run(f"t-p{n}", f"r{n + 1}", **shapes[n % 2])
        rows, d = self.c.evaluate()
        voided = [r for r in rows if r["run_id"].startswith("t-p")]
        # Each run carries the instrument failure provenance outranks.
        self.assertTrue(all(r["unmatched_stops"] or r["decision_conflicts"] for r in voided))
        self.assertEqual({r["status"] for r in voided}, {"void-provenance"})
        self.assertEqual({tuple(r["problems"]) for r in voided}, {("root path",)})
        self.assertEqual(d["decision"], "INCOMPLETE")
        self.assertIn(f"{ARM}: 4 capped voids exceed the cap of 3", d["reasons"])

    def four_two_workspace_rows(self, **over: Any) -> list[dict[str, Any]]:
        """Four runs the analyzer could not read, one more than the cap of three."""
        for n in range(4):
            self.c.run(f"t-w{n}", f"r{n + 1}", **clean_run(**TWO_WORKSPACES, **over))
        rows, _ = self.c.evaluate()
        voided = [r for r in rows if r["run_id"].startswith("t-w")]
        self.assertEqual({r["void"] for r in voided}, {"void-instrument"})
        self.assertTrue(all("2 live workspaces" in r["void_detail"] for r in voided))
        return voided

    def test_an_analyzer_named_instrument_void_with_bad_provenance_is_capped(self) -> None:
        # The analyzer names the void itself here, and the verdict still
        # carries every provenance field, so the run can be judged against the
        # pin: a misconfigured attempt earns no free retry whichever reader
        # broke on it.
        self.c.runs(10)
        voided = self.four_two_workspace_rows(plugin_dir="/roots/elsewhere")
        self.assertEqual({r["status"] for r in voided}, {"void-provenance"})
        self.assertEqual({tuple(r["problems"]) for r in voided}, {("root path",)})
        d = self.c.evaluate()[1]
        self.assertEqual(d["decision"], "INCOMPLETE")
        self.assertIn(f"{ARM}: 4 capped voids exceed the cap of 3", d["reasons"])

    def test_an_analyzer_named_instrument_void_with_clean_provenance_stays_uncapped(self) -> None:
        # The same failure against the pin is still outside the cap: the fix
        # above is an ordering, not a blanket demotion.
        self.c.runs(10)
        voided = self.four_two_workspace_rows()
        self.assertEqual({r["status"] for r in voided}, {"void-instrument"})
        self.assertEqual(self.c.evaluate()[1]["decision"], "PASS")

    def test_claude_code_change_in_a_run_restarts(self) -> None:
        self.c.runs(9)
        self.c.run("t10", "p10", **clean_run(records=clean_records(version="2.1.301")))
        self.assertEqual(self.c.evaluate()[1]["decision"], "RESTART")

    def test_claude_code_change_at_preflight_restarts(self) -> None:
        self.c.runs(10)
        self.c.launch("r1", [], preflight="cc")
        self.assertEqual(self.c.evaluate()[1]["decision"], "RESTART")

    def test_setup_void_is_not_counted(self) -> None:
        self.c.run("t00", "p0", records=[], plugin_dir=ROOT, final="indeterminate",
                   final_reason="quorum error (setup): setup.sh failed (exit 1)", gauntlet={})
        self.c.runs(10)
        self.assertEqual(self.status_of("t00"), "void-setup")
        self.assertEqual(self.c.evaluate()[1]["decision"], "PASS")

    def test_transport_void_is_not_counted(self) -> None:
        lost = {
            "status": "investigate",
            "summary": "gauntlet exited (status 1) without writing a result",
            "reasoning": 'gauntlet stderr (tail): {"error":{"message":"ECONNRESET: The socket connection was closed unexpectedly."}}',
        }
        for n in range(4):
            self.c.run(f"t-t{n}", f"r{n + 1}", records=[], plugin_dir=ROOT, final="indeterminate", gauntlet=lost)
        self.c.runs(10)
        rows, d = self.c.evaluate()
        self.assertEqual({r["status"] for r in rows if r["run_id"].startswith("t-t")}, {"void-transport"})
        self.assertEqual(d["decision"], "PASS")

    def test_dirty_root_is_a_provenance_void(self) -> None:
        self.c.runs(10)
        self.c.run("t99", "p0", launch={"root_clean": "no"}, **clean_run())
        self.assertEqual(self.status_of("t99"), "void-provenance")
        self.assertEqual(self.c.evaluate()[1]["decision"], "PASS")

    def test_failed_launch_runs_are_not_counted(self) -> None:
        self.c.run("t00", "p0", launch={"last": "FAILED 3"}, **clean_run())
        self.c.runs(10)
        self.assertEqual(self.status_of("t00"), "launch-failed")
        self.assertEqual(self.c.evaluate()[1]["decision"], "PASS")

    def test_undeclared_and_missing_logs_are_incomplete(self) -> None:
        self.c.runs(10)
        self.c.run("t-x", "p11", launch={"declare": False}, **clean_run())
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")
        (self.c.logs / f"{ARM}-sdd-turn-liveness-p11.log").unlink()
        self.c.declare("p12")
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")

    def test_too_few_runs_is_incomplete(self) -> None:
        self.c.runs(9)
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")

    def test_voids_past_the_cap_are_incomplete(self) -> None:
        for n in range(4):
            self.c.run(f"t-g{n}", f"r{n + 1}", records=[], plugin_dir=ROOT, final="indeterminate",
                       gauntlet={"status": "investigate", "summary": "harness error"})
        self.c.runs(10)
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")

    def test_interrupted_or_killed_launches_count_toward_the_cap(self) -> None:
        # Quorum prints run-id only when a run finishes: an interrupted run exits 2
        # without one (the launcher writes DONE 2), and a killed one leaves FAILED 137.
        for n in range(4):
            self.c.launch(f"r{n + 1}", [], last="DONE 2" if n % 2 == 0 else "FAILED 137")
        self.c.runs(10)
        rows, d = self.c.evaluate()
        self.assertEqual([r["status"] for r in rows if r["proc"] == "r1"], ["no-run"])
        self.assertEqual(d["decision"], "INCOMPLETE")

    def test_a_missing_claude_code_version_is_a_provenance_void(self) -> None:
        self.c.runs(10)
        # No transcript record carries a version: the Coding-Agent never started.
        self.c.run("t-nv", "p0", **clean_run(records=[], final="fail"))
        rows, d = self.c.evaluate()
        row = next(r for r in rows if r["run_id"] == "t-nv")
        self.assertEqual(row["status"], "void-provenance")
        self.assertIn("cc missing", row["problems"])
        self.assertEqual(d["decision"], "PASS")

    def test_a_version_change_in_a_voided_run_restarts(self) -> None:
        self.c.runs(10)
        self.c.run("t-g", "r1", records=clean_records(version="2.1.301"), plugin_dir=ROOT,
                   final="indeterminate", gauntlet={"status": "investigate", "summary": "harness error"})
        self.assertEqual(self.c.evaluate()[1]["decision"], "RESTART")

    def test_a_version_change_in_a_failed_launch_restarts(self) -> None:
        self.c.runs(10)
        self.c.run("t-f", "r1", launch={"last": "FAILED 3", "after_cc": "2.1.301"}, **clean_run())
        self.assertEqual(self.c.evaluate()[1]["decision"], "RESTART")

    def test_a_version_change_in_an_interrupted_launch_restarts(self) -> None:
        self.c.runs(10)
        self.c.launch("r1", [], last="DONE 2", after_cc="2.1.301")
        self.assertEqual(self.c.evaluate()[1]["decision"], "RESTART")

    def test_quorum_output_cannot_stand_in_for_the_footer(self) -> None:
        self.c.runs(10)
        # The rendered verdict carries model-written text; only the launcher's footer counts.
        self.c.run("t99", "p0", launch={"after_clean": "no",
                                        "body": ["summary: the agent left root_after_clean=yes cc_after=2.1.300"]},
                   **clean_run())
        self.assertEqual(self.status_of("t99"), "void-provenance")
        self.assertEqual(self.c.evaluate()[1]["decision"], "PASS")

    def test_a_refused_launch_is_a_replaceable_row(self) -> None:
        self.c.runs(10)
        self.c.launch("r1", [], preflight="root")
        rows, d = self.c.evaluate()
        self.assertEqual([r["status"] for r in rows if r["proc"] == "r1"], ["preflight-refused"])
        self.assertEqual(d["decision"], "PASS")

    def test_a_run_id_recorded_twice_is_incomplete(self) -> None:
        self.c.runs(9)
        self.c.launch("p10", ["t09"])
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")

    def test_provenance_voids_count_toward_the_cap(self) -> None:
        self.four_voided_rows("v", launch={"root_clean": "no"})
        self.c.runs(10)
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")

    def four_voided_rows(self, prefix: str, *, launch: dict[str, Any] | None = None, **over: Any) -> list[str]:
        """Launch four rows that each differ from the pin in one way: one more than the cap of three."""
        ids: list[str] = []
        for n in range(4):
            run_id = f"t-{prefix}{n}"
            self.c.run(run_id, f"r{n + 1}", launch=launch, **clean_run(**over))
            ids.append(run_id)
        return ids

    def assert_capped_provenance_voids(self, ids: Sequence[str], problem: str) -> None:
        """Each listed row is a provenance void named by ``problem``, and together they pass the cap."""
        rows, decision = self.c.evaluate()
        voided = [r for r in rows if r["run_id"] in set(ids)]
        self.assertEqual({r["status"] for r in voided}, {"void-provenance"})
        self.assertEqual({tuple(r["problems"]) for r in voided}, {(problem,)})
        self.assertIn(f"{ARM}: {len(ids)} capped voids exceed the cap of 3", decision["reasons"])

    def test_a_harness_pin_other_than_the_manifests_is_a_provenance_void(self) -> None:
        self.c.runs(10)
        ids = self.four_voided_rows("h", launch={"harness_pin": "f" * 40})
        self.assert_capped_provenance_voids(ids, "harness pin")

    def test_a_plugin_dir_other_than_the_arms_root_is_a_provenance_void(self) -> None:
        self.c.runs(10)
        # The run loaded skills from somewhere other than the pinned treatment root.
        ids = self.four_voided_rows("d", plugin_dir="/roots/elsewhere")
        self.assert_capped_provenance_voids(ids, "root path")

    def test_a_model_outside_the_allowed_set_is_a_provenance_void(self) -> None:
        self.c.runs(10)
        # A subagent model the pin does not allow.
        ids = self.four_voided_rows("m", models=("claude-opus-5-5", "claude-sonnet-4-6"))
        self.assert_capped_provenance_voids(ids, "models")

    def test_a_failed_codex_pre_check_is_a_provenance_void(self) -> None:
        self.c.runs(10)
        # Codex absence is affirmative: an unchecked run cannot stand in for it.
        ids = self.four_voided_rows("x", codex_check=False)
        self.assert_capped_provenance_voids(ids, "codex")

    def test_a_session_without_the_task_tools_is_a_provenance_void(self) -> None:
        self.c.runs(10)
        ids = self.four_voided_rows("k", records=without_task_tools())
        self.assert_capped_provenance_voids(ids, "task tools")


class Harness(unittest.TestCase):
    def test_evidence_only_descendant_is_accepted_and_a_harness_change_is_not(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)

            def git(*args: str) -> str:
                done = subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True)
                return done.stdout.strip()

            git("init", "-q", "-b", "main")
            git("config", "user.email", "t@example.com")
            git("config", "user.name", "t")
            (repo / "src").mkdir()
            (repo / "src" / "a.ts").write_text("1\n")
            git("add", "-A")
            git("commit", "-qm", "harness")
            pin = git("rev-parse", "HEAD")
            (repo / "evidence").mkdir()
            (repo / "evidence" / "note.md").write_text("x\n")
            git("add", "-A")
            git("commit", "-qm", "evidence")
            self.assertTrue(tally.harness_ok(git("rev-parse", "HEAD"), pin, repo))
            (repo / "tsconfig.json").write_text("{}\n")
            git("add", "-A")
            git("commit", "-qm", "harness change")
            self.assertFalse(tally.harness_ok(git("rev-parse", "HEAD"), pin, repo))


class Pins(unittest.TestCase):
    def write(self, pins: dict[str, str]) -> Path:
        path = Path(self.tmp.name) / "manifest.tsv"
        path.write_text("".join(f"{k}\t{v}\n" for k, v in pins.items()))
        return path

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def test_the_old_control_pins_are_extra_rows_not_missing_values(self) -> None:
        # The campaign dropped the control arm, so a manifest copied from the
        # 2026-10-19 one still names it; the pin it has to carry is this arm's.
        manifest = self.write({**PINS, "control": "c" * 40, "control_root": "/roots/control"})
        self.assertEqual(tally.read_pins(manifest)["treatment_root"], ROOT)

    def test_an_unfilled_treatment_pin_is_still_an_error(self) -> None:
        manifest = self.write({**PINS, "treatment": "<commit>"})
        with self.assertRaises(ValueError):
            tally.read_pins(manifest)


class Decide(unittest.TestCase):
    def row(self, **kw: Any) -> dict[str, Any]:
        base: dict[str, Any] = {
            "plan_decisions": 1, "neither_listed": 0, "false_handbacks": 0, "unadjudicated_allows": 0,
            "false_blocks": 0, "unadjudicated_blocks": 0, "dispatch_fg": 4, "dispatch_bg": 0,
            "dispatch_unclassified": 0, "untracked": [], "short_ok": True, "long_ok": True,
            "live_shell_turn_ends": [], "success": True,
        }
        base.update(kw)
        return base

    def test_ten_clean_runs_pass(self) -> None:
        d = tally.decide([self.row()] * 10)
        self.assertEqual(d["decision"], "PASS")

    def test_h4_fails_below_a_nine_tenths_foreground_share(self) -> None:
        # 17 of 20 dispatches in the foreground is 0.85.
        d = tally.decide([self.row(dispatch_fg=17, dispatch_bg=2, dispatch_unclassified=1)] * 10)
        self.assertEqual(d["foreground_share"], 0.85)
        self.assertFalse(d["H4"])
        self.assertEqual(d["decision"], "FAIL")

    def test_h4_fails_on_one_untracked_launch(self) -> None:
        rows = [self.row(untracked=[{"at": "x", "where": "command", "detail": "nohup"}])] + [self.row()] * 9
        d = tally.decide(rows)
        self.assertEqual(d["untracked_total"], 1)
        self.assertFalse(d["H4"])

    def test_h4_needs_nine_runs_that_handle_both_slow_commands(self) -> None:
        self.assertTrue(tally.decide([self.row(long_ok=False)] + [self.row()] * 9)["H4"])
        eight = [self.row(long_ok=False), self.row(short_ok=False)] + [self.row()] * 8
        d = tally.decide(eight)
        self.assertEqual(d["f_runs"], 8)
        self.assertFalse(d["H4"])

    def test_h4_fails_on_one_turn_end_with_only_a_shell_live(self) -> None:
        d = tally.decide([self.row(live_shell_turn_ends=["2026-10-23T10:00:00+00:00"])] + [self.row()] * 9)
        self.assertEqual(d["live_shell_turn_ends_total"], 1)
        self.assertFalse(d["H4"])

    def test_r_needs_seven_successes(self) -> None:
        self.assertFalse(tally.decide([self.row(success=False)] * 4 + [self.row()] * 6)["R"])
        self.assertTrue(tally.decide([self.row(success=False)] * 3 + [self.row()] * 7)["R"])

    def test_h1_counts_runs_with_a_decision_for_the_plan(self) -> None:
        d = tally.decide([self.row(plan_decisions=0)] + [self.row()] * 9)
        self.assertEqual(d["runs_with_plan_decisions"], 9)
        self.assertFalse(d["H1"])


class Cli(unittest.TestCase):
    def test_the_three_paths_are_options_and_the_rows_carry_the_decision_numbers(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            here = Path(tmp)
            archive = here / "task-21-runs" / "treatment"
            # Task 21's contingency repeats the campaign under a second
            # manifest and archive, so no path may be fixed past its default.
            c = Campaign(here, archive=archive)
            c.runs(10)
            (here / "manifest.tsv").rename(here / "manifest-z4.tsv")
            with mock.patch.object(tally, "HERE", here), contextlib.redirect_stdout(io.StringIO()) as printed:
                code = tally.main(["--manifest", "manifest-z4.tsv", "--archive", "task-21-runs/treatment",
                                   "--out", "tally-z4.txt"])
            self.assertEqual(code, 0)
            text = (here / "tally-z4.txt").read_text()
            self.assertEqual(printed.getvalue(), text)
            first = text.splitlines()[0]
            for token in ("plan_decisions=1", "blocks=0", "allows=1", "neither=0", "unmatched=0",
                          "false_blocks=0", "false_handbacks=0", "fg=2", "bg=0", "unclassified=0",
                          "live=0", "short=True", "long=True", "untracked=0", "censored=0", "success=True",
                          "problems=-"):
                self.assertIn(token, first)
            self.assertIn("decision: PASS", text)
            self.assertEqual(len([ln for ln in text.splitlines() if ln.startswith(ARM)]), 10)


if __name__ == "__main__":
    unittest.main()
