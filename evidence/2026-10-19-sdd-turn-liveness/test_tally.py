# evals/evidence/2026-10-19-sdd-turn-liveness/test_tally.py
"""Tests for tally.py on a synthetic campaign."""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import tally
from synth import control_records, make_run, treatment_records

ROOTS = {"control": "/roots/control", "treatment": "/roots/treatment"}
SHAS = {"control": "c" * 40, "treatment": "t" * 40}
STOPS = (("Moving to Task 3.", "neither"),)
PINS = {
    "harness": "e" * 40, "control": SHAS["control"], "treatment": SHAS["treatment"],
    "control_root": ROOTS["control"], "treatment_root": ROOTS["treatment"], "model": "claude-opus-5-5",
    "cc": "2.1.300", "cc_path": "/usr/local/bin/claude", "provider": "vertex",
    "subagent_models": "claude-opus-5-5,claude-sonnet-5-5,claude-haiku-5-5",
    "codex": "absent", "task_tools": "on",
}


class Campaign:
    def __init__(self, base: Path) -> None:
        self.base = base
        self.results = base / "results"
        self.logs = base / "logs"
        self.logs.mkdir(parents=True)
        self.manifest = base / "manifest.tsv"
        self.rows: list[str] = []
        self._write_manifest()

    def _write_manifest(self) -> None:
        self.manifest.write_text("".join(f"{k}\t{v}\n" for k, v in PINS.items()) + "".join(r + "\n" for r in self.rows))

    def declare(self, arm: str, proc: str) -> None:
        self.rows.append(f"{arm}\tsdd-turn-liveness\t1\t{proc}\tdefault")
        self._write_manifest()

    def launch(self, arm: str, proc: str, run_ids: Sequence[str], *, root_clean: str = "yes", cc: str = "2.1.300",
               last: str = "DONE 0", declare: bool = True, preflight: str | None = None) -> None:
        if declare:
            self.declare(arm, proc)
        header = [
            f"arm={arm} scenario=sdd-turn-liveness repeat={len(run_ids)} proc={proc} budget=default",
            f"root={ROOTS[arm]} root_head={SHAS[arm]} root_clean={root_clean}",
            f"harness_pin={PINS['harness']} cc_path={PINS['cc_path']} provider=vertex",
            f"model=claude-opus-5-5 cc_before={cc} task_tools=1",
        ]
        if preflight:
            lines = header + [f"preflight={preflight}", "claude is 2.1.299, the pin is 2.1.300", "FAILED preflight"]
        else:
            lines = header + [f"run-id: {r}" for r in run_ids] + [
                f"root_after_head={SHAS[arm]} root_after_clean={root_clean} cc_after={cc} finished=x", last,
            ]
        (self.logs / f"{arm}-sdd-turn-liveness-{proc}.log").write_text("\n".join(lines) + "\n")

    def arm(self, arm: str, count: int, records: Callable[[], list[dict[str, Any]]], stops: Sequence[tuple[str, str]] = ()) -> None:
        for n in range(1, count + 1):
            run_id = f"{arm}-{n:02d}"
            make_run(self.results, run_id, records(), plugin_dir=ROOTS[arm], stops=stops)
            self.launch(arm, f"p{n}", [run_id])

    def evaluate(self, adjudications: Path | None = None) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        none = self.base / "none"
        return tally.evaluate(self.manifest, self.logs, adjudications, self.results, {"control": none, "treatment": none})


class Evaluate(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.c = Campaign(Path(self.tmp.name))

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_pass(self) -> None:
        self.c.arm("control", 10, control_records, STOPS)
        self.c.arm("treatment", 10, treatment_records)
        _, d = self.c.evaluate()
        self.assertEqual(d["decision"], "PASS")
        self.assertIs(d["P"], True)
        self.assertEqual((d["premature_control"], d["premature_treatment"]), (10, 0))
        self.assertEqual(d["foreground_share"], 1.0)

    def test_p_unmeasured_when_control_has_no_premature_stop(self) -> None:
        self.c.arm("control", 10, treatment_records)
        self.c.arm("treatment", 10, treatment_records)
        _, d = self.c.evaluate()
        self.assertEqual(d["P"], "unmeasured")
        self.assertEqual(d["decision"], "PASS")

    def test_background_treatment_fails_w1(self) -> None:
        self.c.arm("control", 10, control_records, STOPS)
        self.c.arm("treatment", 10, control_records, STOPS)
        _, d = self.c.evaluate()
        self.assertFalse(d["W1"])
        self.assertEqual(d["decision"], "FAIL")

    def test_claude_code_change_in_a_run_restarts(self) -> None:
        self.c.arm("control", 10, control_records, STOPS)
        self.c.arm("treatment", 9, treatment_records)
        make_run(self.c.results, "treatment-10", treatment_records(version="2.1.301"), plugin_dir=ROOTS["treatment"])
        self.c.launch("treatment", "p10", ["treatment-10"])
        self.assertEqual(self.c.evaluate()[1]["decision"], "RESTART")

    def test_claude_code_change_at_preflight_restarts(self) -> None:
        self.c.arm("control", 10, control_records, STOPS)
        self.c.arm("treatment", 10, treatment_records)
        self.c.launch("treatment", "r1", [], preflight="cc")
        self.assertEqual(self.c.evaluate()[1]["decision"], "RESTART")

    def test_setup_void_is_not_counted(self) -> None:
        make_run(self.c.results, "control-00", [], plugin_dir=ROOTS["control"], final="indeterminate",
                 final_reason="quorum error (setup): setup.sh failed (exit 1)", gauntlet={})
        self.c.launch("control", "p0", ["control-00"])
        self.c.arm("control", 10, control_records, STOPS)
        self.c.arm("treatment", 10, treatment_records)
        rows, d = self.c.evaluate()
        self.assertEqual(next(r for r in rows if r["run_id"] == "control-00")["status"], "void-setup")
        self.assertEqual(d["decision"], "PASS")

    def test_dirty_root_is_a_provenance_void(self) -> None:
        self.c.arm("control", 10, control_records, STOPS)
        self.c.arm("treatment", 10, treatment_records)
        make_run(self.c.results, "treatment-99", treatment_records(), plugin_dir=ROOTS["treatment"])
        self.c.launch("treatment", "p0", ["treatment-99"], root_clean="no")
        rows, d = self.c.evaluate()
        self.assertEqual(next(r for r in rows if r["run_id"] == "treatment-99")["status"], "void-provenance")
        self.assertEqual(d["decision"], "PASS")

    def test_failed_launch_runs_are_not_counted(self) -> None:
        self.c.arm("control", 10, control_records, STOPS)
        make_run(self.c.results, "treatment-00", treatment_records(), plugin_dir=ROOTS["treatment"])
        self.c.launch("treatment", "p0", ["treatment-00"], last="FAILED 3")
        self.c.arm("treatment", 10, treatment_records)
        rows, d = self.c.evaluate()
        self.assertEqual(next(r for r in rows if r["run_id"] == "treatment-00")["status"], "launch-failed")
        self.assertEqual(d["decision"], "PASS")

    def test_undeclared_and_missing_logs_are_incomplete(self) -> None:
        self.c.arm("control", 10, control_records, STOPS)
        self.c.arm("treatment", 10, treatment_records)
        make_run(self.c.results, "treatment-x", treatment_records(), plugin_dir=ROOTS["treatment"])
        self.c.launch("treatment", "p11", ["treatment-x"], declare=False)
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")
        (self.c.logs / "treatment-sdd-turn-liveness-p11.log").unlink()
        self.c.declare("treatment", "p12")
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")

    def test_too_few_runs_is_incomplete(self) -> None:
        self.c.arm("control", 10, control_records, STOPS)
        self.c.arm("treatment", 9, treatment_records)
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")

    def test_voids_past_the_cap_are_incomplete(self) -> None:
        for n in range(4):
            make_run(self.c.results, f"control-g{n}", [], plugin_dir=ROOTS["control"], final="indeterminate",
                     gauntlet={"status": "investigate", "summary": "harness error"})
            self.c.launch("control", f"r{n + 1}", [f"control-g{n}"])
        self.c.arm("control", 10, control_records, STOPS)
        self.c.arm("treatment", 10, treatment_records)
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")

    def test_a_refused_launch_is_a_replaceable_row(self) -> None:
        self.c.arm("control", 10, control_records, STOPS)
        self.c.arm("treatment", 10, treatment_records)
        self.c.launch("treatment", "r1", [], preflight="root")
        rows, d = self.c.evaluate()
        self.assertEqual([r["status"] for r in rows if r["proc"] == "r1"], ["preflight-refused"])
        self.assertEqual(d["decision"], "PASS")

    def test_a_run_id_recorded_twice_is_incomplete(self) -> None:
        self.c.arm("control", 10, control_records, STOPS)
        self.c.arm("treatment", 9, treatment_records)
        self.c.launch("treatment", "p10", ["treatment-09"])
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")

    def test_provenance_voids_count_toward_the_cap(self) -> None:
        for n in range(4):
            run_id = f"treatment-v{n}"
            make_run(self.c.results, run_id, treatment_records(), plugin_dir=ROOTS["treatment"])
            self.c.launch("treatment", f"r{n + 1}", [run_id], root_clean="no")
        self.c.arm("control", 10, control_records, STOPS)
        self.c.arm("treatment", 10, treatment_records)
        self.assertEqual(self.c.evaluate()[1]["decision"], "INCOMPLETE")

    def test_unadjudicated_candidate_blocks_the_decision(self) -> None:
        self.c.arm("control", 9, control_records, STOPS)
        make_run(self.c.results, "control-10", control_records(), plugin_dir=ROOTS["control"])
        self.c.launch("control", "p10", ["control-10"])
        self.c.arm("treatment", 10, treatment_records)
        self.assertEqual(self.c.evaluate()[1]["decision"], "UNADJUDICATED")
        adjudications = Path(self.tmp.name) / "adjudications.tsv"
        adjudications.write_text("control-10\t2026-10-20T10:03:30+00:00\tneither\tread by hand\n")
        self.assertEqual(self.c.evaluate(adjudications)[1]["decision"], "PASS")


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


class Decide(unittest.TestCase):
    def row(self, **kw: Any) -> dict[str, Any]:
        base = {"dispatch_fg": 4, "dispatch_bg": 0, "dispatch_unclassified": 0, "live_turn_ends": [], "short_ok": True,
                "long_ok": True, "untracked": [], "premature": 0, "success": True}
        base.update(kw)
        return base

    def test_r_needs_seven_successes(self) -> None:
        control = [self.row(premature=1, success=False)] * 10
        treatment = [self.row(success=False)] * 4 + [self.row()] * 6
        self.assertFalse(tally.decide(control, treatment)["R"])

    def test_w2_allows_one_live_turn_end(self) -> None:
        control = [self.row(premature=1)] * 10
        treatment = [self.row(live_turn_ends=[{"at": "x", "idle_seconds": 5.0}])] + [self.row()] * 9
        self.assertTrue(tally.decide(control, treatment)["W2"])
        treatment = [self.row(live_turn_ends=[{"at": "x", "idle_seconds": 5.0}])] * 2 + [self.row()] * 8
        self.assertFalse(tally.decide(control, treatment)["W2"])

    def test_unclassified_dispatches_count_against_w1(self) -> None:
        control = [self.row(premature=1)] * 10
        treatment = [self.row(dispatch_fg=8, dispatch_unclassified=2)] * 10
        self.assertFalse(tally.decide(control, treatment)["W1"])


if __name__ == "__main__":
    unittest.main()
