"""Tests for the paired-control analyzer.

Two committed layout fixtures stand in for the two arms. ``baseline-layout``
keeps the Coding-Agent's ``home/`` inside the record, the way every run before
the relocation recorded it; ``relocated-layout`` keeps it under
``workspaces/``. Each is copied into a temporary tree with its ``__RECORDS__``
and ``__WORKSPACES__`` placeholders expanded, so the absolute paths a fixture
records are the paths of the tree the test reads.
"""

from __future__ import annotations

import json
import shutil
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

FIXTURES = HERE / "fixtures"
BASELINE_RUN = "cost-api-field-rename-boundary-claude-auto-20261014T120000Z-b001"
NEW_RUN = "cost-api-field-rename-boundary-claude-auto-20261014T130000Z-n001"
PLUGIN_ROOT = "/Users/johnss51/.cache/hyperpowers/relocation-control/hp-6160"
MODEL_ID = "claude-opus-5-5"
CC_VERSION = "2.1.288"
SCENARIO = "cost-api-field-rename-boundary"
FOREIGN_INSTRUCTION = "/Users/johnss51/.claude/CLAUDE.md"
LAYOUTS = (("baseline-layout", BASELINE_RUN), ("relocated-layout", NEW_RUN))

# The six verdict fixtures and the kind each must classify as. The launcher
# (Task 15) copies the same files, so both tools read one set of examples.
VERDICT_KINDS = (
    ("pass", "pass"),
    ("fail", "fail"),
    ("void-grader-exit", "void-grader-exit"),
    ("void-harness-setup", "void-harness-setup"),
    ("qa-agent-misconfigured", "qa-agent-misconfigured"),
    ("stalled-agent", "indeterminate"),
)

PASS_VERDICT: dict[str, Any] = {
    "final": "pass",
    "error": None,
    "checks": [{"check": "file-exists", "passed": True}],
}
FAIL_VERDICT: dict[str, Any] = {
    "final": "fail",
    "error": None,
    "checks": [{"check": "file-exists", "passed": False}],
}
CAPTURE_VERDICT: dict[str, Any] = {
    "final": "indeterminate",
    "error": {"stage": "capture", "message": "tool-call capture was empty"},
    "checks": [],
}


def row(
    kind: str = "pass",
    *,
    run_id: str = "run",
    verdict: dict[str, Any] | None = None,
    manip: list[str] | None = None,
    proc: str = "p1",
) -> dict[str, Any]:
    """Build one analyzer row, the shape ``collect`` emits.

    :param kind: The classified kind.
    :param run_id: The run id the decision reports.
    :param verdict: The parsed verdict; a pass or fail one by default.
    :param manip: The manipulation-check failures, none by default.
    :param proc: The log process slot, ``r<n>`` for a replacement.
    :returns: The row.
    """
    parsed = verdict or (PASS_VERDICT if kind == "pass" else FAIL_VERDICT)
    return {
        "run_id": run_id,
        "proc": proc,
        "kind": kind,
        "verdict": parsed,
        "final": parsed["final"],
        "manip": manip or [],
    }


def arm(
    passes: int, fails: int, extra: Sequence[dict[str, Any]] = ()
) -> list[dict[str, Any]]:
    """Build one arm's rows.

    :param passes: Rows whose kind is ``pass``.
    :param fails: Rows whose kind is ``fail``, all sharing one signature.
    :param extra: Rows appended unchanged (voids, replacements).
    :returns: The arm's rows.
    """
    rows = [row("pass", run_id=f"pass-{i}") for i in range(passes)]
    rows += [row("fail", run_id=f"fail-{i}") for i in range(fails)]
    return rows + list(extra)


def rewrite(path: Path, old: str, new: str) -> None:
    """Replace a fixture's text, failing loudly when the fixture has drifted.

    :param path: The fixture file.
    :param old: The exact text the fixture is expected to carry.
    :param new: Its replacement.
    :raises AssertionError: When ``old`` is not in the file.
    """
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise AssertionError(f"fixture drift: {old!r} not in {path}")
    path.write_text(text.replace(old, new), encoding="utf-8")


def launch_of(tree: Path, run_id: str) -> Path:
    """Return a run's launch record, which stays in the record tree.

    :param tree: The materialized fixture root.
    :param run_id: The run id.
    :returns: The ``launch-agent`` path.
    """
    return tree / "records" / run_id / "gauntlet-agent" / "context" / "launch-agent"


def transcript_of(tree: Path, run_id: str) -> Path:
    """Return a run's one main transcript, from whichever tree holds it.

    :param tree: The materialized fixture root.
    :param run_id: The run id.
    :returns: The transcript path.
    :raises AssertionError: When the fixture does not hold exactly one.
    """
    found = sorted(tree.glob(f"*/{run_id}/home/.claude/projects/*/*.jsonl"))
    if len(found) != 1:
        raise AssertionError(f"fixture drift: {len(found)} transcripts for {run_id}")
    return found[0]


def mutate_root(tree: Path, run_id: str) -> None:
    """Launch the agent against a plugin root other than the pinned one."""
    rewrite(
        launch_of(tree, run_id),
        f'--plugin-dir "{PLUGIN_ROOT}"',
        '--plugin-dir "/tmp/not-the-pinned-plugin-root"',
    )


def mutate_model(tree: Path, run_id: str) -> None:
    """Launch the agent on a model other than the pinned one."""
    rewrite(
        launch_of(tree, run_id),
        f'--model "{MODEL_ID}"',
        '--model "claude-sonnet-5-5"',
    )


def mutate_cc(tree: Path, run_id: str) -> None:
    """Record a Claude Code version other than the pinned one."""
    rewrite(
        transcript_of(tree, run_id),
        f'"version":"{CC_VERSION}"',
        '"version":"2.1.290"',
    )


def mutate_entrypoint(tree: Path, run_id: str) -> None:
    """Record an entrypoint other than the CLI."""
    rewrite(transcript_of(tree, run_id), '"entrypoint":"cli"', '"entrypoint":"sdk-ts"')


def mutate_foreign_instructions(tree: Path, run_id: str) -> None:
    """Load an instruction file from outside the run's own two trees."""
    path = transcript_of(tree, run_id)
    lines: list[str] = []
    changed = False
    for line in path.read_text(encoding="utf-8").splitlines():
        entry = json.loads(line)
        attachment = entry.get("attachment") or {}
        if attachment.get("type") == "instructions" and not changed:
            attachment["files"][0]["path"] = FOREIGN_INSTRUCTION
            changed = True
        lines.append(json.dumps(entry))
    if not changed:
        raise AssertionError(f"fixture drift: no instructions attachment in {path}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def mutate_tasks(tree: Path, run_id: str) -> None:
    """Offer the task tools, which the pinned conditions withhold."""
    delta = {
        "type": "attachment",
        "attachment": {"type": "deferred_tools_delta", "addedNames": ["TaskCreate"]},
    }
    path = transcript_of(tree, run_id)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(delta) + "\n")


MUTATIONS: tuple[tuple[str, Callable[[Path, str], None]], ...] = (
    ("root", mutate_root),
    ("model", mutate_model),
    ("cc", mutate_cc),
    ("entrypoint", mutate_entrypoint),
    ("foreign_instructions", mutate_foreign_instructions),
    ("tasks", mutate_tasks),
)


class LayoutCase(unittest.TestCase):
    """A test over the committed layout fixtures."""

    def materialize(self, *layouts: str) -> Path:
        """Copy layout fixtures into one temporary tree and expand their paths.

        Every layout shares the tree's ``records/`` and ``workspaces/`` roots,
        the way both arms of the real campaign share one evals clone; each
        keeps its own log directory at ``logs-<layout>``.

        :param layouts: The fixture directory names.
        :returns: The materialized tree root.
        """
        root = Path(tempfile.mkdtemp(prefix="tally-fixture-")).resolve()
        self.addCleanup(shutil.rmtree, root, True)
        for layout in layouts:
            src = FIXTURES / layout
            for sub in ("records", "workspaces"):
                if (src / sub).is_dir():
                    shutil.copytree(src / sub, root / sub, dirs_exist_ok=True)
            shutil.copytree(src / "logs", root / f"logs-{layout}")
        for path in sorted(root.rglob("*")):
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8")
            if "__RECORDS__" in text or "__WORKSPACES__" in text:
                path.write_text(
                    text.replace("__RECORDS__", str(root / "records")).replace(
                        "__WORKSPACES__", str(root / "workspaces")
                    ),
                    encoding="utf-8",
                )
        return root

    def config(self, root: Path) -> tally.Config:
        """Build the campaign's pinned conditions over a materialized tree.

        :param root: The materialized tree root.
        :returns: The config every analyzer function reads.
        """
        return tally.Config(
            records=root / "records",
            workspaces=root / "workspaces",
            plugin_root=PLUGIN_ROOT,
            model=MODEL_ID,
            cc_version=CC_VERSION,
            scenario=SCENARIO,
        )


class ReadoutsTest(LayoutCase):
    """Case 1 and 2: both layouts are read, and criterion 1 is the observable."""

    def test_readouts_find_the_transcript_in_both_layouts(self) -> None:
        for layout, run_id in LAYOUTS:
            with self.subTest(layout=layout):
                root = self.materialize(layout)
                out = tally.readouts(self.config(root), run_id)
                self.assertEqual(out["plugin_dir"], PLUGIN_ROOT)
                self.assertEqual(out["model"], MODEL_ID)
                self.assertEqual(out["cc"], CC_VERSION)
                self.assertEqual(out["entrypoint"], "cli")
                self.assertEqual(out["foreign_instructions"], [])
                self.assertIs(out["desc"], True)
                self.assertIs(out["tasks"], False)
                self.assertEqual(out["first_tool"], "Skill(hyperpowers:brainstorming)")
                self.assertEqual(out["skills"], ["hyperpowers:brainstorming"])

    def test_own_roots_name_the_record_and_the_workspace(self) -> None:
        root = self.materialize("relocated-layout")
        record_root, workspace_root = tally.own_roots(self.config(root), NEW_RUN)
        self.assertEqual(record_root, f"{root}/records/{NEW_RUN}/")
        self.assertEqual(workspace_root, f"{root}/workspaces/{NEW_RUN}/")

    def test_criterion_one_is_read_from_the_result_not_the_final(self) -> None:
        for layout, run_id in LAYOUTS:
            with self.subTest(layout=layout):
                root = self.materialize(layout)
                rows, missing = tally.collect(
                    root / f"logs-{layout}", self.config(root)
                )
                self.assertEqual(missing, 0)
                self.assertEqual(len(rows), 1)
                self.assertEqual(rows[0]["run_id"], run_id)
                self.assertEqual(rows[0]["kind"], "pass")
                self.assertEqual(rows[0]["final"], "fail")


class ManipulationTest(LayoutCase):
    """Case 3: each of the six checks, mismatched in turn, in both layouts."""

    def test_each_check_stops_the_campaign_in_both_layouts(self) -> None:
        for layout, run_id in LAYOUTS:
            for name, mutate in MUTATIONS:
                with self.subTest(layout=layout, check=name):
                    root = self.materialize(layout)
                    mutate(root, run_id)
                    rows, _ = tally.collect(root / f"logs-{layout}", self.config(root))
                    self.assertEqual(len(rows), 1)
                    self.assertEqual(
                        [entry.split("=", 1)[0] for entry in rows[0]["manip"]], [name]
                    )
                    baseline_side = tally.decide(rows, arm(5, 5))
                    self.assertEqual(baseline_side.outcome, "stop")
                    self.assertEqual(baseline_side.reason, "manipulation")
                    self.assertTrue(baseline_side.detail.startswith("baseline:"))
                    self.assertEqual(tally.exit_code(baseline_side), 2)
                    new_side = tally.decide(arm(5, 5), rows)
                    self.assertEqual(new_side.outcome, "stop")
                    self.assertEqual(new_side.reason, "manipulation")
                    self.assertTrue(new_side.detail.startswith("new:"))
                    self.assertEqual(tally.exit_code(new_side), 2)


class CountsTest(unittest.TestCase):
    """Case 4: ten qualifying sessions per arm, voids replaced up to the cap."""

    def test_nine_qualifying_sessions_stop_as_insufficient(self) -> None:
        decision = tally.decide(arm(5, 5), arm(5, 4))
        self.assertEqual(decision.outcome, "stop")
        self.assertEqual(decision.reason, "insufficient")
        self.assertEqual(decision.detail, "baseline=10 new=9")
        self.assertEqual(tally.exit_code(decision), 3)

    def test_a_void_does_not_count_and_its_replacement_does(self) -> None:
        new = arm(
            5,
            4,
            (
                row("void-grader-exit", run_id="void-1", proc="p10"),
                row("fail", run_id="replacement-1", proc="r1"),
            ),
        )
        self.assertEqual(len(tally.qualifying(new)), 10)
        decision = tally.decide(arm(5, 5), new)
        self.assertEqual(decision.outcome, "proceed")
        self.assertEqual(decision.detail, "p_b=5 p_n=5")
        self.assertEqual(tally.exit_code(decision), 0)

    def test_a_fourth_grader_exit_void_trips_the_cap_in_either_arm(self) -> None:
        voids = tuple(row("void-grader-exit", run_id=f"void-{i}") for i in range(4))
        for label, baseline, new in (
            ("baseline", arm(5, 5, voids), arm(5, 5)),
            ("new", arm(5, 5), arm(5, 5, voids)),
        ):
            with self.subTest(arm=label):
                decision = tally.decide(baseline, new)
                self.assertEqual(decision.outcome, "stop")
                self.assertEqual(decision.reason, "void-cap")
                self.assertEqual(
                    decision.detail, f"{label}: 4 grader-exit voids, cap 3"
                )
                self.assertEqual(tally.exit_code(decision), 3)

    def test_three_grader_exit_voids_are_within_the_cap(self) -> None:
        voids = tuple(row("void-grader-exit", run_id=f"void-{i}") for i in range(3))
        decision = tally.decide(arm(5, 5), arm(5, 5, voids))
        self.assertEqual(decision.outcome, "proceed")
        self.assertEqual(tally.exit_code(decision), 0)

    def test_a_harness_setup_void_does_not_consume_the_cap(self) -> None:
        extra = tuple(row("void-grader-exit", run_id=f"void-{i}") for i in range(3)) + (
            row("void-harness-setup", run_id="setup-void-1"),
        )
        decision = tally.decide(arm(5, 5, extra), arm(5, 5))
        self.assertEqual(decision.outcome, "proceed")
        self.assertEqual(tally.exit_code(decision), 0)


class ImmediateStopTest(LayoutCase):
    """Case 5: a new-arm setup void or misconfigured QA agent stops at once."""

    def test_a_new_arm_setup_kind_stops_regardless_of_counts(self) -> None:
        for kind in ("void-harness-setup", "qa-agent-misconfigured"):
            with self.subTest(kind=kind):
                new = arm(5, 5, (row(kind, run_id="new-setup-1"),))
                decision = tally.decide(arm(5, 5), new)
                self.assertEqual(decision.outcome, "stop")
                self.assertEqual(decision.reason, "new-arm-setup")
                self.assertEqual(decision.detail, "new-setup-1")
                self.assertEqual(tally.exit_code(decision), 2)

    def test_a_baseline_setup_void_is_a_relaunch_not_a_stop(self) -> None:
        baseline = arm(5, 5, (row("void-harness-setup", run_id="setup-void-1"),))
        decision = tally.decide(baseline, arm(5, 5))
        self.assertEqual(decision.outcome, "proceed")
        self.assertEqual(tally.exit_code(decision), 0)

    def test_a_baseline_misconfigured_run_stops_as_manipulation(self) -> None:
        root = self.materialize("baseline-layout")
        record = root / "records" / BASELINE_RUN
        shutil.copyfile(
            FIXTURES / "verdicts" / "qa-agent-misconfigured.json",
            record / "verdict.json",
        )
        # A misconfigured QA agent never launched the pinned agent, so the
        # run carries neither a launch record nor a transcript.
        shutil.rmtree(record / "gauntlet-agent")
        shutil.rmtree(record / "home")
        rows, _ = tally.collect(root / "logs-baseline-layout", self.config(root))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["kind"], "qa-agent-misconfigured")
        self.assertEqual(
            [entry.split("=", 1)[0] for entry in rows[0]["manip"]],
            ["root", "model", "cc", "entrypoint"],
        )
        decision = tally.decide(rows, arm(5, 5))
        self.assertEqual(decision.outcome, "stop")
        self.assertEqual(decision.reason, "manipulation")
        self.assertEqual(tally.exit_code(decision), 2)


class FailureSignatureTest(unittest.TestCase):
    """Case 6: a new-arm failure the baseline never produced stops."""

    def test_a_signature_names_the_final_the_stage_and_the_failed_checks(self) -> None:
        verdict = {
            "final": "fail",
            "error": None,
            "checks": [
                {"check": "file-exists", "passed": False},
                {"check": "assert-checkout-clean", "passed": True},
            ],
        }
        self.assertEqual(
            tally.failure_signature(verdict), ("fail", "none", ("file-exists",))
        )
        self.assertEqual(
            tally.failure_signature(CAPTURE_VERDICT),
            ("indeterminate", "capture", ()),
        )

    def test_a_novel_new_arm_signature_stops(self) -> None:
        new = arm(
            5, 4, (row("indeterminate", run_id="new-9", verdict=CAPTURE_VERDICT),)
        )
        decision = tally.decide(arm(5, 5), new)
        self.assertEqual(decision.outcome, "stop")
        self.assertEqual(decision.reason, "novel-failure")
        self.assertIn("indeterminate", decision.detail)
        self.assertIn("capture", decision.detail)
        self.assertEqual(tally.exit_code(decision), 4)

    def test_a_signature_both_arms_produced_proceeds(self) -> None:
        baseline = arm(
            5, 4, (row("indeterminate", run_id="base-9", verdict=CAPTURE_VERDICT),)
        )
        new = arm(
            5, 4, (row("indeterminate", run_id="new-9", verdict=CAPTURE_VERDICT),)
        )
        decision = tally.decide(baseline, new)
        self.assertEqual(decision.outcome, "proceed")
        self.assertEqual(tally.exit_code(decision), 0)

    def test_signatures_are_verdict_level_not_kind(self) -> None:
        novel = {
            "final": "fail",
            "error": None,
            "checks": [{"check": "assert-checkout-clean", "passed": False}],
        }
        # Criterion 1 passed while the run's final verdict failed: the kind is
        # a pass, and the failure still has to be one the baseline produced.
        new = arm(4, 5, (row("pass", run_id="new-9", verdict=novel),))
        decision = tally.decide(arm(5, 5), new)
        self.assertEqual(decision.outcome, "stop")
        self.assertEqual(decision.reason, "novel-failure")
        self.assertIn("assert-checkout-clean", decision.detail)
        # The mirror case: a kind of fail over a passing verdict contributes
        # no signature at all.
        passing = arm(5, 4, (row("fail", run_id="new-9", verdict=PASS_VERDICT),))
        self.assertEqual(tally.decide(arm(5, 5), passing).outcome, "proceed")


class ThresholdTest(unittest.TestCase):
    """Case 7: the predeclared two-pass band."""

    def test_one_fewer_pass_proceeds(self) -> None:
        decision = tally.decide(arm(5, 5), arm(4, 6))
        self.assertEqual(decision.outcome, "proceed")
        self.assertEqual(decision.reason, "threshold")
        self.assertEqual(decision.detail, "p_b=5 p_n=4")
        self.assertEqual(tally.exit_code(decision), 0)

    def test_three_fewer_passes_is_a_human_decision(self) -> None:
        decision = tally.decide(arm(5, 5), arm(2, 8))
        self.assertEqual(decision.outcome, "stop")
        self.assertEqual(decision.reason, "threshold")
        self.assertEqual(decision.detail, "p_b=5 p_n=2")
        self.assertEqual(tally.exit_code(decision), 5)


class CollectTest(LayoutCase):
    """Case 8: one arm per directory, each read in its own layout."""

    def test_foreign_log_names_are_ignored(self) -> None:
        root = self.materialize("baseline-layout")
        logs = root / "logs-baseline-layout"
        self.assertTrue((logs / "baseline-p1.log").is_file())
        self.assertTrue((logs / "control-cost-tls-verify-boundary-p1.log").is_file())
        rows, missing = tally.collect(logs, self.config(root))
        self.assertEqual(missing, 0)
        self.assertEqual([r["proc"] for r in rows], ["p1"])
        self.assertEqual([r["run_id"] for r in rows], [BASELINE_RUN])

    def test_a_named_run_without_a_verdict_is_counted_not_dropped(self) -> None:
        root = self.materialize("baseline-layout")
        (root / "records" / BASELINE_RUN / "verdict.json").unlink()
        rows, missing = tally.collect(root / "logs-baseline-layout", self.config(root))
        self.assertEqual(rows, [])
        self.assertEqual(missing, 1)

    def test_each_arm_reads_its_own_directory_and_layout(self) -> None:
        root = self.materialize("baseline-layout", "relocated-layout")
        cfg = self.config(root)
        baseline, _ = tally.collect(root / "logs-baseline-layout", cfg)
        new, _ = tally.collect(root / "logs-relocated-layout", cfg)
        self.assertEqual([r["run_id"] for r in baseline], [BASELINE_RUN])
        self.assertEqual([r["run_id"] for r in new], [NEW_RUN])
        self.assertEqual(
            {r["run_id"] for r in baseline} & {r["run_id"] for r in new}, set()
        )
        # The relocated run has no home in the record tree, so its readouts
        # can only have come from the workspace.
        self.assertFalse((root / "records" / NEW_RUN / "home").exists())
        self.assertFalse((root / "workspaces" / BASELINE_RUN).exists())
        for rows in (baseline, new):
            self.assertEqual(rows[0]["cc"], CC_VERSION)
            self.assertEqual(rows[0]["foreign_instructions"], [])
            self.assertEqual(rows[0]["manip"], [])


class ClassifyTest(unittest.TestCase):
    """Case 9: the six verdict fixtures, in process and over the CLI."""

    @staticmethod
    def paths(name: str) -> tuple[Path, Path | None]:
        """Return a fixture's verdict and its result, when it has one.

        :param name: The fixture's kind name.
        :returns: The verdict path and the result path or None.
        """
        result = FIXTURES / "results" / f"{name}.json"
        return FIXTURES / "verdicts" / f"{name}.json", (
            result if result.is_file() else None
        )

    def test_classify_reads_the_six_verdict_fixtures(self) -> None:
        for name, kind in VERDICT_KINDS:
            with self.subTest(fixture=name):
                verdict_path, result_path = self.paths(name)
                verdict = json.loads(verdict_path.read_text(encoding="utf-8"))
                result = (
                    json.loads(result_path.read_text(encoding="utf-8"))
                    if result_path
                    else None
                )
                self.assertEqual(tally.classify(verdict, result), kind)

    def test_the_classify_subcommand_prints_the_same_kinds(self) -> None:
        for name, kind in VERDICT_KINDS:
            with self.subTest(fixture=name):
                verdict_path, result_path = self.paths(name)
                argv = [sys.executable, str(HERE / "tally.py"), "classify"]
                argv.append(str(verdict_path))
                if result_path:
                    argv.append(str(result_path))
                proc = subprocess.run(argv, capture_output=True, text=True, check=False)
                self.assertEqual(proc.returncode, 0, proc.stderr)
                self.assertEqual(proc.stdout.strip(), kind)


class CliTest(LayoutCase):
    """The CLI over both arms of one records root: table, decision, exit code."""

    def test_the_cli_fails_closed_on_two_short_arms(self) -> None:
        root = self.materialize("baseline-layout", "relocated-layout")
        proc = subprocess.run(
            [
                sys.executable,
                str(HERE / "tally.py"),
                "--records",
                str(root / "records"),
                "--workspaces",
                str(root / "workspaces"),
                "--baseline-logs",
                str(root / "logs-baseline-layout"),
                "--new-logs",
                str(root / "logs-relocated-layout"),
                "--plugin-root",
                PLUGIN_ROOT,
                "--model",
                MODEL_ID,
                "--cc-version",
                CC_VERSION,
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(proc.returncode, 3, proc.stderr)
        self.assertIn("stop insufficient", proc.stdout)
        self.assertIn("baseline=1 new=1", proc.stdout)
        for run_id in (BASELINE_RUN, NEW_RUN):
            self.assertIn("-".join(run_id.rsplit("-", 2)[-2:]), proc.stdout)


if __name__ == "__main__":
    unittest.main()
