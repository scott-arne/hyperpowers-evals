"""Tests for the paired-control analyzer.

Two committed layout fixtures stand in for the two arms. ``baseline-layout``
keeps the Coding-Agent's ``home/`` inside the record, the way every run before
the relocation recorded it; ``relocated-layout`` keeps it under
``workspaces/``. Each is copied into a temporary tree with its ``__RECORDS__``
and ``__WORKSPACES__`` placeholders expanded, so the absolute paths a fixture
records are the paths of the tree the test reads.
"""

from __future__ import annotations

import contextlib
import io
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
# The provenance each layout fixture must report: the pre-change tree keeps the
# agent's home in the record, the relocated one keeps it in the workspace.
PROVENANCE = {"baseline-layout": "legacy", "relocated-layout": "relocated"}
# The arm each layout fixture is read as.
ARM_OF = {"baseline-layout": "baseline", "relocated-layout": "new"}
# Five spellings of one run id that all name its record directory: the first
# three collapse when the path is joined, the traversal and the absolute path
# reach it through the file system. Each is built from the materialized root.
ALIASES: tuple[tuple[str, Callable[[Path, str], str]], ...] = (
    ("trailing-dot", lambda _root, run_id: f"{run_id}/."),
    ("leading-dot", lambda _root, run_id: f"./{run_id}"),
    ("double-slash", lambda _root, run_id: f"{run_id}//"),
    ("traversal", lambda _root, run_id: f"../records/{run_id}"),
    ("absolute", lambda root, run_id: f"{root}/records/{run_id}"),
)

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
    layout: str = "legacy",
    integrity: list[str] | None = None,
) -> dict[str, Any]:
    """Build one analyzer row, the shape ``collect`` emits.

    :param kind: The classified kind.
    :param run_id: The run id the decision reports.
    :param verdict: The parsed verdict; a pass or fail one by default.
    :param manip: The manipulation-check failures, none by default.
    :param proc: The log process slot, ``r<n>`` for a replacement.
    :param layout: The tree the run's transcript came from.
    :param integrity: The integrity failures, none by default.
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
        "layout": layout,
        "integrity": integrity or [],
    }


def clean_arm(prefix: str, layout: str, count: int = 10) -> list[dict[str, Any]]:
    """Build one arm of passing rows that no integrity check objects to.

    :param prefix: The run-id prefix, which keeps the arms disjoint.
    :param layout: The tree the arm's transcripts came from.
    :param count: How many rows.
    :returns: The arm's rows.
    """
    return [row("pass", run_id=f"{prefix}-{i}", layout=layout) for i in range(count)]


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
    """Launch the agent against a plugin root other than the pinned one.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
    rewrite(
        launch_of(tree, run_id),
        f'--plugin-dir "{PLUGIN_ROOT}"',
        '--plugin-dir "/tmp/not-the-pinned-plugin-root"',
    )


def mutate_model(tree: Path, run_id: str) -> None:
    """Launch the agent on a model other than the pinned one.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
    rewrite(
        launch_of(tree, run_id),
        f'--model "{MODEL_ID}"',
        '--model "claude-sonnet-5-5"',
    )


def mutate_cc(tree: Path, run_id: str) -> None:
    """Record a Claude Code version other than the pinned one.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
    rewrite(
        transcript_of(tree, run_id),
        f'"version":"{CC_VERSION}"',
        '"version":"2.1.290"',
    )


def mutate_entrypoint(tree: Path, run_id: str) -> None:
    """Record an entrypoint other than the CLI.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
    rewrite(transcript_of(tree, run_id), '"entrypoint":"cli"', '"entrypoint":"sdk-ts"')


def rewrite_instruction(tree: Path, run_id: str, make: Callable[[str], str]) -> None:
    """Rewrite the first instruction path a run's transcript recorded.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    :param make: Builds the new path from the recorded one.
    :raises AssertionError: When the fixture has no instructions attachment.
    """
    path = transcript_of(tree, run_id)
    lines: list[str] = []
    changed = False
    for line in path.read_text(encoding="utf-8").splitlines():
        entry = json.loads(line)
        attachment = entry.get("attachment") or {}
        if attachment.get("type") == "instructions" and not changed:
            files = attachment["files"]
            files[0]["path"] = make(str(files[0]["path"]))
            changed = True
        lines.append(json.dumps(entry))
    if not changed:
        raise AssertionError(f"fixture drift: no instructions attachment in {path}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def insert_line(tree: Path, run_id: str, line: str) -> None:
    """Put a line into the middle of a run's transcript.

    Mid-file, so it is never read as the torn tail of a killed session.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    :param line: The raw line to insert.
    """
    path = transcript_of(tree, run_id)
    lines = path.read_text(encoding="utf-8").splitlines()
    lines.insert(len(lines) - 1, line)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def mutate_foreign_instructions(tree: Path, run_id: str) -> None:
    """Load an instruction file from outside the run's own two trees.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
    rewrite_instruction(tree, run_id, lambda _: FOREIGN_INSTRUCTION)


def mutate_traversal_instruction(tree: Path, run_id: str) -> None:
    """Leave the run's tree by traversal while keeping its prefix.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
    rewrite_instruction(
        tree, run_id, lambda old: f"{Path(old).parent}/../../../outside/CLAUDE.md"
    )


def mutate_embedded_root_instruction(tree: Path, run_id: str) -> None:
    """Embed the run's own prefix in a path that is somewhere else entirely.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
    rewrite_instruction(tree, run_id, lambda old: f"/tmp/decoy{old}")


def mutate_hidden_tasks_line(tree: Path, run_id: str) -> None:
    """Hide a task-tool offer in a line that does not parse.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
    insert_line(
        tree,
        run_id,
        '{"type":"attachment","attachment":{"type":"deferred_tools_delta",'
        '"addedNames":["TaskCreate"]',
    )


def mutate_hidden_instruction_line(tree: Path, run_id: str) -> None:
    """Hide a foreign instruction file in a line that does not parse.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
    insert_line(
        tree,
        run_id,
        '{"type":"attachment","attachment":{"type":"instructions","files":'
        f'[{{"path":"{FOREIGN_INSTRUCTION}"}}]',
    )


def mutate_non_object_line(tree: Path, run_id: str) -> None:
    """Record a line that is valid JSON but not a transcript entry.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
    insert_line(tree, run_id, '"deferred_tools_delta TaskCreate"')


def mutate_torn_tail(tree: Path, run_id: str) -> None:
    """End the transcript mid-write, the way a killed session does.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
    path = transcript_of(tree, run_id)
    with path.open("a", encoding="utf-8") as handle:
        handle.write('{"type":"attachment","attachment":{"type":"deferred_to')


def mutate_typed_entrypoint(tree: Path, run_id: str) -> None:
    """Record the entrypoint as a list, ahead of the plain CLI line.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
    entry = {"type": "attachment", "entrypoint": ["sdk-ts"], "version": CC_VERSION}
    path = transcript_of(tree, run_id)
    text = path.read_text(encoding="utf-8")
    path.write_text(json.dumps(entry) + "\n" + text, encoding="utf-8")


def mutate_second_entrypoint(tree: Path, run_id: str) -> None:
    """Continue the session from a second entrypoint after the CLI.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
    entry = {
        "type": "attachment",
        "entrypoint": "sdk-ts",
        "version": CC_VERSION,
        "attachment": {"type": "date", "date": "2026-10-14"},
    }
    path = transcript_of(tree, run_id)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry) + "\n")


def mutate_tasks(tree: Path, run_id: str) -> None:
    """Offer the task tools, which the pinned conditions withhold.

    :param tree: The materialized fixture root.
    :param run_id: The run id to mutate.
    """
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

    def collect_quietly(
        self, logs: Path, cfg: tally.Config
    ) -> tuple[list[dict[str, Any]], int, str]:
        """Run ``collect`` with the table it prints captured, not emitted.

        Every in-process call goes through here, so the suite's own output
        stays pristine and a test that reads the table has it to hand.

        :param logs: The arm's log directory.
        :param cfg: The campaign configuration.
        :returns: The rows, the count of runs that could not be read, and the
            printed table.
        """
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            rows, missing = tally.collect(logs, cfg)
        return rows, missing, buffer.getvalue()

    def run_cli(
        self, root: Path, baseline_logs: str, new_logs: str
    ) -> subprocess.CompletedProcess[str]:
        """Run the analyzer over a materialized tree.

        :param root: The materialized tree root.
        :param baseline_logs: The directory name read as the baseline arm.
        :param new_logs: The directory name read as the relocated arm.
        :returns: The finished process, with its output captured.
        """
        return subprocess.run(
            [
                sys.executable,
                str(HERE / "tally.py"),
                "--records",
                str(root / "records"),
                "--workspaces",
                str(root / "workspaces"),
                "--baseline-logs",
                str(root / baseline_logs),
                "--new-logs",
                str(root / new_logs),
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
                self.assertEqual(out["layout"], PROVENANCE[layout])
                self.assertEqual(out["malformed"], [])
                self.assertIs(out["torn_tail"], False)

    def test_own_roots_name_the_record_and_the_workspace(self) -> None:
        root = self.materialize("relocated-layout")
        # The tree is already resolved, so each root has one form.
        self.assertEqual(
            tally.own_roots(self.config(root), NEW_RUN),
            (f"{root}/records/{NEW_RUN}/", f"{root}/workspaces/{NEW_RUN}/"),
        )

    def test_own_roots_follow_a_symlinked_campaign_root(self) -> None:
        root = self.materialize("baseline-layout")
        link = Path(tempfile.mkdtemp(prefix="tally-link-")).resolve() / "evals"
        self.addCleanup(shutil.rmtree, link.parent, True)
        link.symlink_to(root, target_is_directory=True)
        # The transcripts hold the resolved paths; the campaign is addressed
        # through the link, the way a run under /tmp is on this host.
        linked = tally.Config(
            records=link / "records",
            workspaces=link / "workspaces",
            plugin_root=PLUGIN_ROOT,
            model=MODEL_ID,
            cc_version=CC_VERSION,
            scenario=SCENARIO,
        )
        roots = tally.own_roots(linked, BASELINE_RUN)
        self.assertIn(f"{link}/records/{BASELINE_RUN}/", roots)
        self.assertIn(f"{root}/records/{BASELINE_RUN}/", roots)
        self.assertEqual(
            tally.readouts(linked, BASELINE_RUN)["foreign_instructions"], []
        )
        rows, _, _ = self.collect_quietly(link / "logs-baseline-layout", linked)
        self.assertEqual(rows[0]["manip"], [])

    def test_criterion_one_is_read_from_the_result_not_the_final(self) -> None:
        for layout, run_id in LAYOUTS:
            with self.subTest(layout=layout):
                root = self.materialize(layout)
                rows, missing, _ = self.collect_quietly(
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
                    rows, _, _ = self.collect_quietly(
                        root / f"logs-{layout}", self.config(root)
                    )
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

    def test_paths_that_only_look_owned_are_foreign(self) -> None:
        cases = (
            ("traversal", mutate_traversal_instruction),
            ("embedded-root", mutate_embedded_root_instruction),
        )
        for layout, run_id in LAYOUTS:
            for name, mutate in cases:
                with self.subTest(layout=layout, case=name):
                    root = self.materialize(layout)
                    mutate(root, run_id)
                    rows, _, _ = self.collect_quietly(
                        root / f"logs-{layout}", self.config(root)
                    )
                    self.assertEqual(
                        [entry.split("=", 1)[0] for entry in rows[0]["manip"]],
                        ["foreign_instructions"],
                    )
                    decision = tally.decide(rows, arm(5, 5))
                    self.assertEqual(decision.outcome, "stop")
                    self.assertEqual(decision.reason, "manipulation")
                    self.assertEqual(tally.exit_code(decision), 2)

    def test_a_second_entrypoint_is_a_manipulation_stop(self) -> None:
        for layout, run_id in LAYOUTS:
            with self.subTest(layout=layout):
                root = self.materialize(layout)
                mutate_second_entrypoint(root, run_id)
                rows, _, _ = self.collect_quietly(
                    root / f"logs-{layout}", self.config(root)
                )
                # The CLI entrypoint is still there; it is no longer the only
                # one, which the first-wins reading could not see.
                self.assertEqual(rows[0]["entrypoint"], "cli,sdk-ts")
                self.assertEqual(rows[0]["manip"], ["entrypoint=cli,sdk-ts"])
                decision = tally.decide(rows, arm(5, 5))
                self.assertEqual(decision.outcome, "stop")
                self.assertEqual(decision.reason, "manipulation")
                self.assertEqual(tally.exit_code(decision), 2)

    def test_an_entrypoint_of_the_wrong_type_is_a_manipulation_stop(self) -> None:
        root = self.materialize("baseline-layout")
        mutate_typed_entrypoint(root, BASELINE_RUN)
        rows, _, _ = self.collect_quietly(
            root / "logs-baseline-layout", self.config(root)
        )
        # Recorded as written rather than dropped, so the plain "cli" line
        # that follows it cannot stand in for the whole session.
        self.assertEqual(rows[0]["entrypoint"], "['sdk-ts'],cli")
        self.assertEqual(rows[0]["manip"], ["entrypoint=['sdk-ts'],cli"])
        self.assertEqual(rows[0]["integrity"], [])
        decision = tally.decide(rows, arm(5, 5))
        self.assertEqual(decision.outcome, "stop")
        self.assertEqual(decision.reason, "manipulation")
        self.assertEqual(tally.exit_code(decision), 2)


class IntegrityTest(LayoutCase):
    """What must hold before the two arms can be compared at all."""

    def flaws(
        self, rows: list[dict[str, Any]], other: list[dict[str, Any]]
    ) -> list[str]:
        """Check one arm's rows against a clean, disjoint second arm.

        :param rows: The arm under test, read as the baseline.
        :param other: The second arm.
        :returns: The integrity failures.
        """
        return tally.integrity_failures(
            Path("/logs/baseline"),
            Path("/logs/new"),
            rows,
            other,
            self.config(Path("/nowhere")),
        )

    def assert_stops(self, flaws: list[str]) -> None:
        """Assert a set of failures is a stop at the manipulation's exit code.

        :param flaws: The integrity failures.
        """
        self.assertTrue(flaws)
        decision = tally.Decision("stop", "integrity", "; ".join(flaws))
        self.assertEqual(tally.exit_code(decision), 2)

    def test_the_arms_must_be_two_different_log_directories(self) -> None:
        root = self.materialize("baseline-layout")
        logs = root / "logs-baseline-layout"
        rows, _, _ = self.collect_quietly(logs, self.config(root))
        flaws = tally.integrity_failures(logs, logs, rows, rows, self.config(root))
        self.assertTrue(any("one log directory for both arms" in f for f in flaws))
        self.assert_stops(flaws)

    def test_a_run_id_in_both_arms_is_an_integrity_stop(self) -> None:
        baseline = clean_arm("shared", "legacy")
        new = clean_arm("shared", "relocated")
        flaws = self.flaws(baseline, new)
        self.assertTrue(any("both arms claim" in f for f in flaws))
        self.assert_stops(flaws)
        # Disjoint ids, same shape: nothing to object to.
        self.assertEqual(self.flaws(baseline, clean_arm("new", "relocated")), [])

    def test_an_arm_reading_the_other_layout_is_an_integrity_stop(self) -> None:
        flaws = self.flaws(clean_arm("b", "relocated"), clean_arm("n", "relocated"))
        self.assertTrue(any("expected the legacy layout" in f for f in flaws))
        self.assert_stops(flaws)

    def test_swapped_arms_are_an_integrity_stop(self) -> None:
        root = self.materialize("baseline-layout", "relocated-layout")
        proc = self.run_cli(root, "logs-relocated-layout", "logs-baseline-layout")
        self.assertEqual(proc.returncode, 2, proc.stderr)
        self.assertIn("stop integrity", proc.stdout)
        self.assertIn("expected the legacy layout", proc.stdout)
        self.assertIn("expected the relocated layout", proc.stdout)

    def test_a_log_naming_two_runs_is_an_integrity_stop(self) -> None:
        root = self.materialize("baseline-layout")
        logs = root / "logs-baseline-layout"
        log = logs / "control-cost-api-field-rename-boundary-p1.log"
        log.write_text(
            log.read_text(encoding="utf-8") + f"run-id: {BASELINE_RUN}\n",
            encoding="utf-8",
        )
        rows, _, table = self.collect_quietly(logs, self.config(root))
        self.assertEqual(len(rows), 2)
        for r in rows:
            self.assertIn(f"log-run-ids=2 ({log.name})", r["integrity"])
        self.assertIn("integrity=log-run-ids=2", table)
        self.assert_stops(self.flaws(rows, clean_arm("n", "relocated")))

    def test_blank_transcript_lines_are_not_integrity_failures(self) -> None:
        cases = ("mid-file", "trailing-newline")
        for case in cases:
            with self.subTest(case=case):
                root = self.materialize("baseline-layout")
                path = transcript_of(root, BASELINE_RUN)
                text = path.read_text(encoding="utf-8")
                if case == "mid-file":
                    lines = text.splitlines()
                    lines.insert(2, "   ")
                    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
                else:
                    path.write_text(text + "\n", encoding="utf-8")
                rows, _, _ = self.collect_quietly(
                    root / "logs-baseline-layout", self.config(root)
                )
                self.assertEqual(rows[0]["integrity"], [])
                self.assertIs(rows[0]["torn_tail"], False)
                self.assertEqual(rows[0]["manip"], [])
        # A line with something unreadable in it still stops the campaign.
        root = self.materialize("baseline-layout")
        mutate_non_object_line(root, BASELINE_RUN)
        rows, _, _ = self.collect_quietly(
            root / "logs-baseline-layout", self.config(root)
        )
        self.assert_stops(self.flaws(rows, clean_arm("n", "relocated")))

    def test_a_two_id_log_stops_even_when_neither_run_resolves(self) -> None:
        root = self.materialize("baseline-layout", "relocated-layout")
        logs = root / "logs-baseline-layout"
        log = logs / "control-cost-api-field-rename-boundary-p1.log"
        log.write_text(
            "arm=control scenario=cost-api-field-rename-boundary proc=p1\n"
            "run-id: cost-api-field-rename-boundary-claude-auto-20261014T140000Z-gh01\n"
            "run-id: cost-api-field-rename-boundary-claude-auto-20261014T140001Z-gh02\n",
            encoding="utf-8",
        )
        rows, missing, table = self.collect_quietly(logs, self.config(root))
        # No row carries the flaw, because neither id wrote a verdict.
        self.assertEqual(rows, [])
        self.assertEqual(missing, 2)
        self.assertEqual(table.count("NO VERDICT"), 2)
        flaws = tally.integrity_failures(
            logs, root / "logs-relocated-layout", rows, [], self.config(root)
        )
        self.assertIn(f"baseline: log-run-ids=2 ({log.name})", flaws)
        self.assert_stops(flaws)
        proc = self.run_cli(root, "logs-baseline-layout", "logs-relocated-layout")
        self.assertEqual(proc.returncode, 2, proc.stderr)
        self.assertIn("stop integrity", proc.stdout)
        self.assertIn("log-run-ids=2", proc.stdout)

    def test_a_run_id_repeated_across_logs_is_an_integrity_stop(self) -> None:
        root = self.materialize("baseline-layout")
        logs = root / "logs-baseline-layout"
        log = logs / "control-cost-api-field-rename-boundary-p1.log"
        (logs / "control-cost-api-field-rename-boundary-p2.log").write_text(
            log.read_text(encoding="utf-8"), encoding="utf-8"
        )
        rows, _, _ = self.collect_quietly(logs, self.config(root))
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["integrity"], [])
        self.assertEqual(rows[1]["integrity"], ["duplicate-run-id"])
        self.assert_stops(self.flaws(rows, clean_arm("n", "relocated")))

    def flaws_in_place(
        self, root: Path, layout: str, rows: list[dict[str, Any]]
    ) -> list[str]:
        """Check one layout's rows, as its own arm, against the other fixture arm.

        Both layouts are materialized under ``root``; the other arm is read
        from its own log directory, so the only failures are the ones ``rows``
        bring.

        :param root: The materialized tree root, holding both layouts.
        :param layout: The layout fixture ``rows`` came from.
        :param rows: The arm under test.
        :returns: The integrity failures.
        """
        cfg = self.config(root)
        arms = {layout: rows}
        for other, _ in LAYOUTS:
            if other != layout:
                arms[other], _, _ = self.collect_quietly(root / f"logs-{other}", cfg)
        return tally.integrity_failures(
            root / "logs-baseline-layout",
            root / "logs-relocated-layout",
            arms["baseline-layout"],
            arms["relocated-layout"],
            cfg,
        )

    def test_the_run_id_shape_is_the_runners_directory_name(self) -> None:
        for value in (BASELINE_RUN, NEW_RUN, "R", "a.b_c-d9"):
            with self.subTest(accepted=value):
                self.assertTrue(tally.valid_run_id(value))
        rejected = ("", ".", "..", ".hidden", "-x", "a/b", "a\\b", "/a", "a b", "a\n")
        for value in rejected:
            with self.subTest(rejected=value):
                self.assertFalse(tally.valid_run_id(value))

    def test_an_alias_of_a_run_id_is_an_integrity_stop(self) -> None:
        for layout, run_id in LAYOUTS:
            for name, make in ALIASES:
                with self.subTest(layout=layout, alias=name):
                    root = self.materialize("baseline-layout", "relocated-layout")
                    alias = make(root, run_id)
                    # The alias does name the run's record: joined to the
                    # records root it reads the same verdict, which is what
                    # let one trial count as two.
                    aliased = root / "records" / alias / "verdict.json"
                    self.assertTrue(aliased.is_file())
                    logs = root / f"logs-{layout}"
                    log = logs / "control-cost-api-field-rename-boundary-p2.log"
                    log.write_text(
                        f"arm=control scenario={SCENARIO} proc=p2\nrun-id: {alias}\n",
                        encoding="utf-8",
                    )
                    rows, missing, table = self.collect_quietly(logs, self.config(root))
                    # Only the canonical spelling made a row, and that row is
                    # untouched; the alias is named in the table, not read.
                    self.assertEqual([r["run_id"] for r in rows], [run_id])
                    self.assertEqual(rows[0]["integrity"], [])
                    self.assertEqual(rows[0]["manip"], [])
                    self.assertEqual(missing, 1)
                    self.assertIn(f"\tp2\t{alias}\tBAD RUN ID", table)
                    flaws = self.flaws_in_place(root, layout, rows)
                    self.assertEqual(
                        flaws, [f"{ARM_OF[layout]}: bad-run-id={alias} ({log.name})"]
                    )
                    self.assert_stops(flaws)

    def test_the_cli_stops_on_an_aliased_run_id(self) -> None:
        root = self.materialize("baseline-layout", "relocated-layout")
        logs = root / "logs-baseline-layout"
        log = logs / "control-cost-api-field-rename-boundary-p2.log"
        log.write_text(
            f"arm=control scenario={SCENARIO} proc=p2\nrun-id: {BASELINE_RUN}/.\n",
            encoding="utf-8",
        )
        proc = self.run_cli(root, "logs-baseline-layout", "logs-relocated-layout")
        self.assertEqual(proc.returncode, 2, proc.stderr)
        self.assertIn("BAD RUN ID", proc.stdout)
        self.assertIn("stop integrity", proc.stdout)
        expected = f"baseline: bad-run-id={BASELINE_RUN}/. ({log.name})"
        self.assertIn(expected, proc.stdout)

    def test_a_run_that_resolves_outside_its_root_is_an_integrity_stop(self) -> None:
        # A well-formed id cannot leave its root by spelling; a run directory
        # that is a symlink can, and the analyzer must say so rather than read
        # through it. The record is moved out under the baseline layout, the
        # workspace under the relocated one.
        for layout, run_id in LAYOUTS:
            with self.subTest(layout=layout):
                root = self.materialize("baseline-layout", "relocated-layout")
                tree = "records" if layout == "baseline-layout" else "workspaces"
                outside = Path(tempfile.mkdtemp(prefix="tally-outside-")).resolve()
                self.addCleanup(shutil.rmtree, outside, True)
                shutil.move(str(root / tree / run_id), str(outside / run_id))
                (root / tree / run_id).symlink_to(
                    outside / run_id, target_is_directory=True
                )
                rows, _, table = self.collect_quietly(
                    root / f"logs-{layout}", self.config(root)
                )
                self.assertEqual([r["run_id"] for r in rows], [run_id])
                # Read through the link, every pin still holds; the run is
                # not where the campaign keeps its runs.
                self.assertEqual(rows[0]["layout"], PROVENANCE[layout])
                self.assertEqual(rows[0]["manip"], [])
                self.assertEqual(rows[0]["integrity"], [f"run-outside-root={run_id}"])
                self.assertIn(f"integrity=run-outside-root={run_id}", table)
                flaws = self.flaws_in_place(root, layout, rows)
                self.assertEqual(
                    flaws, [f"{ARM_OF[layout]}:{run_id}: run-outside-root={run_id}"]
                )
                self.assert_stops(flaws)

    def test_a_graded_run_without_one_result_is_an_integrity_stop(self) -> None:
        results = ("gauntlet-agent", "results")
        for name, count in (("removed", 0), ("duplicated", 2)):
            with self.subTest(case=name):
                root = self.materialize("baseline-layout")
                tree = root.joinpath("records", BASELINE_RUN, *results)
                if count:
                    shutil.copytree(tree / "g1", tree / "g2")
                else:
                    shutil.rmtree(tree)
                rows, _, table = self.collect_quietly(
                    root / "logs-baseline-layout", self.config(root)
                )
                self.assertEqual(rows[0]["final"], "fail")
                self.assertIn(f"result-cardinality={count}", rows[0]["integrity"])
                self.assertIn("result=none", table)
                self.assert_stops(self.flaws(rows, clean_arm("n", "relocated")))

    def test_result_cardinality_cannot_mask_a_threshold_gap(self) -> None:
        # Five baseline passes, two of which lost their result file: read as
        # indeterminate they lower p_b from 5 to 3 and the gap from 3 to 1.
        baseline = (
            [row("pass", run_id=f"b-pass-{i}") for i in range(3)]
            + [
                row(
                    "indeterminate",
                    run_id=f"b-masked-{i}",
                    verdict=PASS_VERDICT,
                    integrity=["result-cardinality=0"],
                )
                for i in range(2)
            ]
            + [row("fail", run_id=f"b-fail-{i}") for i in range(5)]
        )
        new = [
            row("pass", run_id=f"n-pass-{i}", layout="relocated") for i in range(2)
        ] + [row("fail", run_id=f"n-fail-{i}", layout="relocated") for i in range(8)]
        masked = tally.decide(baseline, new)
        self.assertEqual(masked.outcome, "proceed")
        self.assertEqual(masked.detail, "p_b=3 p_n=2")
        self.assert_stops(self.flaws(baseline, new))

    def test_an_unreadable_transcript_line_is_an_integrity_stop(self) -> None:
        cases = (
            ("hidden-tasks", mutate_hidden_tasks_line),
            ("hidden-instruction", mutate_hidden_instruction_line),
            ("non-object", mutate_non_object_line),
        )
        for layout, run_id in LAYOUTS:
            for name, mutate in cases:
                with self.subTest(layout=layout, case=name):
                    root = self.materialize(layout)
                    mutate(root, run_id)
                    rows, _, table = self.collect_quietly(
                        root / f"logs-{layout}", self.config(root)
                    )
                    # Every pin still reads as satisfied: the hidden line is
                    # exactly what the manipulation checks cannot see.
                    self.assertEqual(rows[0]["manip"], [])
                    self.assertEqual(len(rows[0]["integrity"]), 1)
                    self.assertTrue(
                        rows[0]["integrity"][0].startswith("malformed-transcript=")
                    )
                    self.assertIn(":4", rows[0]["integrity"][0])
                    self.assertIn("integrity=malformed-transcript=", table)
                    self.assert_stops(self.flaws(rows, clean_arm("n", "relocated")))

    def test_a_torn_tail_is_recorded_and_tolerated(self) -> None:
        for layout, run_id in LAYOUTS:
            with self.subTest(layout=layout):
                root = self.materialize(layout)
                mutate_torn_tail(root, run_id)
                rows, _, table = self.collect_quietly(
                    root / f"logs-{layout}", self.config(root)
                )
                self.assertIs(rows[0]["torn_tail"], True)
                self.assertEqual(rows[0]["integrity"], [])
                self.assertEqual(rows[0]["manip"], [])
                self.assertIn("torn_tail=True", table)
                # The torn arm, against a clean one on the other layout.
                arms = {PROVENANCE[layout]: rows}
                arms.setdefault("legacy", clean_arm("b", "legacy"))
                arms.setdefault("relocated", clean_arm("n", "relocated"))
                self.assertEqual(
                    tally.integrity_failures(
                        Path("/logs/baseline"),
                        Path("/logs/new"),
                        arms["legacy"],
                        arms["relocated"],
                        self.config(root),
                    ),
                    [],
                )


class CountsTest(unittest.TestCase):
    """Case 4: ten qualifying sessions per arm, voids replaced up to the cap."""

    def test_nine_qualifying_sessions_stop_as_insufficient(self) -> None:
        decision = tally.decide(arm(5, 5), arm(5, 4))
        self.assertEqual(decision.outcome, "stop")
        self.assertEqual(decision.reason, "insufficient")
        self.assertEqual(decision.detail, "baseline=10 new=9")
        self.assertEqual(tally.exit_code(decision), 3)

    def test_a_short_baseline_arm_stops_as_insufficient(self) -> None:
        decision = tally.decide(arm(5, 4), arm(5, 5))
        self.assertEqual(decision.outcome, "stop")
        self.assertEqual(decision.reason, "insufficient")
        self.assertEqual(decision.detail, "baseline=9 new=10")
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
        rows, _, _ = self.collect_quietly(
            root / "logs-baseline-layout", self.config(root)
        )
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
        rows, missing, _ = self.collect_quietly(logs, self.config(root))
        self.assertEqual(missing, 0)
        self.assertEqual([r["proc"] for r in rows], ["p1"])
        self.assertEqual([r["run_id"] for r in rows], [BASELINE_RUN])

    def test_a_named_run_without_a_verdict_is_counted_not_dropped(self) -> None:
        root = self.materialize("baseline-layout")
        (root / "records" / BASELINE_RUN / "verdict.json").unlink()
        rows, missing, _ = self.collect_quietly(
            root / "logs-baseline-layout", self.config(root)
        )
        self.assertEqual(rows, [])
        self.assertEqual(missing, 1)

    def test_a_log_naming_no_run_is_counted_not_dropped(self) -> None:
        root = self.materialize("baseline-layout")
        logs = root / "logs-baseline-layout"
        (logs / "control-cost-api-field-rename-boundary-p2.log").write_text(
            "arm=control scenario=cost-api-field-rename-boundary proc=p2\n"
            "quorum exited before it printed a run id\n",
            encoding="utf-8",
        )
        rows, missing, table = self.collect_quietly(logs, self.config(root))
        self.assertEqual([r["run_id"] for r in rows], [BASELINE_RUN])
        self.assertEqual(missing, 1)
        self.assertIn("NO RUN ID", table)
        self.assertIn("control-cost-api-field-rename-boundary-p2.log", table)

    def test_a_run_without_one_result_is_marked_in_the_table(self) -> None:
        root = self.materialize("baseline-layout")
        logs = root / "logs-baseline-layout"
        graded, _, present = self.collect_quietly(logs, self.config(root))
        self.assertEqual(graded[0]["kind"], "pass")
        self.assertNotIn("result=none", present)
        # Without exactly one result.json the run is read as indeterminate,
        # which is a real trial; the marker says why it is one.
        shutil.rmtree(root / "records" / BASELINE_RUN / "gauntlet-agent" / "results")
        rows, missing, table = self.collect_quietly(logs, self.config(root))
        self.assertEqual(missing, 0)
        self.assertEqual(rows[0]["kind"], "indeterminate")
        self.assertIn("result=none", table)

    def test_each_arm_reads_its_own_directory_and_layout(self) -> None:
        root = self.materialize("baseline-layout", "relocated-layout")
        cfg = self.config(root)
        baseline, _, _ = self.collect_quietly(root / "logs-baseline-layout", cfg)
        new, _, _ = self.collect_quietly(root / "logs-relocated-layout", cfg)
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
        proc = self.run_cli(root, "logs-baseline-layout", "logs-relocated-layout")
        self.assertEqual(proc.returncode, 3, proc.stderr)
        self.assertIn("stop insufficient", proc.stdout)
        self.assertIn("baseline=1 new=1", proc.stdout)
        for run_id in (BASELINE_RUN, NEW_RUN):
            self.assertIn("-".join(run_id.rsplit("-", 2)[-2:]), proc.stdout)


if __name__ == "__main__":
    unittest.main()
