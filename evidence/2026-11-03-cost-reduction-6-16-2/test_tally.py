"""Tests for tally.py: synthetic runs plus one real turn-liveness transcript."""

from __future__ import annotations

import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from typing import Any

import tally

SDD = tally.SDD
BRAIN = tally.BRAIN
REAL = (
    tally.EVALS
    / "evidence/2026-10-19-sdd-turn-liveness/task-9-runs/smoke/control/workspaces"
    / "sdd-turn-liveness-claude-auto-20261021T185013Z-d4c8/home/.claude/projects"
)


def tool_use(name: str, args: dict[str, Any], ident: str) -> dict[str, Any]:
    return {
        "type": "assistant",
        "message": {"content": [{"type": "tool_use", "name": name, "input": args, "id": ident}]},
    }


def agent(description: str, ident: str, prompt: str = "") -> dict[str, Any]:
    return tool_use("Agent", {"description": description, "prompt": prompt}, ident)


def notif(ident: str) -> dict[str, Any]:
    text = (
        f"<task-notification> <task-id>a</task-id> <tool-use-id>{ident}</tool-use-id> "
        "<status>completed</status> </task-notification>"
    )
    return {"type": "user", "message": {"content": text}}


def compact() -> dict[str, Any]:
    return {"type": "system", "subtype": "compact_boundary", "compactMetadata": {"trigger": "auto"}}


def result(ident: str, is_error: bool = False) -> dict[str, Any]:
    block = {"type": "tool_result", "tool_use_id": ident, "content": "text", "is_error": is_error}
    return {"type": "user", "message": {"content": [block]}}


def read(path: str, is_error: bool = False) -> list[dict[str, Any]]:
    """A Read call and its result, as two entries."""
    return [tool_use("Read", {"file_path": path}, "r-" + path), result("r-" + path, is_error)]


SDD_SKILL = "/x/skills/subagent-driven-development/SKILL.md"


def skill(name: str) -> dict[str, Any]:
    return tool_use("Skill", {"skill": name}, "s-" + name)


def make_run(
    base: Path,
    run_id: str,
    entries: list[dict[str, Any]],
    final: str = "pass",
    checks: list[dict[str, Any]] | None = None,
    verdict_extra: dict[str, Any] | None = None,
) -> Path:
    record = base / run_id
    (record / "home/.claude/projects/x").mkdir(parents=True)
    (record / "home/.claude/projects/x/s.jsonl").write_text(
        "\n".join(json.dumps(e) for e in entries) + "\n", encoding="utf-8"
    )
    verdict = {
        "final": final,
        "checks": checks if checks is not None else [{"phase": "post", "check": "file-exists", "passed": True}],
        **(verdict_extra or {}),
    }
    (record / "verdict.json").write_text(json.dumps(verdict), encoding="utf-8")
    return record


def transcripts(record: Path) -> list[Path]:
    return sorted(record.glob("home/.claude/projects/*/*.jsonl"))


def full_trial(skip: set[str] | None = None) -> list[dict[str, Any]]:
    """A passing trial; ``skip`` names pieces to drop for the negative cases."""
    skip = skip or set()
    out = [
        agent("Implement Task 1: a", "i1"), notif("i1"),
        agent("Review Task 1 (spec + quality)", "v1"), notif("v1"),
        compact(),
        *read(SDD_SKILL),
        agent("Implement Task 2: b", "i2"), notif("i2"),
        agent("Review Task 2 (spec + quality)", "v2"), notif("v2"),
        agent("Implement Task 3: c", "i3"), notif("i3"),
        agent("Review Task 3 (spec + quality)", "v3"), notif("v3"),
        agent("Implement Task 4: d", "i4"), notif("i4"),
        agent("Review Task 4 (spec + quality)", "v4"), notif("v4"),
        agent("Final whole-branch code review", "f"),
    ]
    if "final-notif" not in skip:
        out.append(notif("f"))
    out.append(skill("hyperpowers:finishing-a-development-branch"))
    if "final-notif" in skip and "late-final-notif" in skip:
        out.append(notif("f"))
    return out


def reading_of(entries: list[dict[str, Any]]) -> dict[str, Any]:
    with tempfile.TemporaryDirectory() as tmp:
        record = make_run(Path(tmp), "r", entries)
        return tally.sdd_reading(tally.events(transcripts(record)))


class SddReading(unittest.TestCase):
    def test_1_valid_passing_trial(self) -> None:
        reading = reading_of(full_trial())
        self.assertTrue(reading["valid"])
        self.assertTrue(reading["outcome"])
        self.assertTrue(reading["mechanism"])

    def test_2_compaction_before_review1_notification_is_void(self) -> None:
        entries = [
            agent("Implement Task 1: a", "i1"), notif("i1"),
            agent("Review Task 1 (spec + quality)", "v1"),
            compact(), notif("v1"),
            *read(SDD_SKILL),
        ]
        self.assertFalse(reading_of(entries)["valid"])

    def test_2a_pre_dispatch_compaction_then_in_window_compaction_is_valid(self) -> None:
        reading = reading_of([compact(), *full_trial()])
        self.assertTrue(reading["valid"])
        self.assertTrue(reading["outcome"])
        self.assertTrue(reading["mechanism"])

    def test_2b_compactions_only_before_review1_completes_are_void(self) -> None:
        entries = [
            compact(), agent("Implement Task 1: a", "i1"), notif("i1"),
            agent("Review Task 1 (spec + quality)", "v1"),
            compact(), notif("v1"),
            *read(SDD_SKILL),
        ]
        self.assertFalse(reading_of(entries)["valid"])

    def test_3_compaction_before_review1_dispatch_is_void(self) -> None:
        entries = [agent("Implement Task 1: a", "i1"), notif("i1"), compact(), agent("Review Task 1", "v1"), notif("v1")]
        self.assertFalse(reading_of(entries)["valid"])

    def test_4_task_in_flight_lost_its_review(self) -> None:
        entries = [
            agent("Implement Task 1: a", "i1"), notif("i1"),
            agent("Review Task 1 (spec + quality)", "v1"), notif("v1"),
            agent("Implement Task 2: b", "i2"), notif("i2"),
            compact(),
            *read(SDD_SKILL),
            agent("Implement Task 3: c", "i3"), notif("i3"),
            agent("Review Task 3 (spec + quality)", "v3"), notif("v3"),
            agent("Implement Task 4: d", "i4"), notif("i4"),
            agent("Review Task 4 (spec + quality)", "v4"), notif("v4"),
            agent("Final whole-branch code review", "f"), notif("f"),
            skill("hyperpowers:finishing-a-development-branch"),
        ]
        reading = reading_of(entries)
        self.assertTrue(reading["valid"])
        self.assertFalse(reading["outcome"])

    def test_5_implementer_1_redispatched(self) -> None:
        entries = full_trial()
        index = next(i for i, e in enumerate(entries) if e.get("type") == "system") + 2
        entries.insert(index, agent("Implement Task 1: a again", "i1b"))
        reading = reading_of(entries)
        self.assertTrue(reading["valid"])
        self.assertFalse(reading["outcome"])

    def test_6_read_after_first_dispatch_fails_mechanism(self) -> None:
        entries = full_trial()
        entries = [e for e in entries if "r-" not in json.dumps(e)]
        entries[next(i for i, e in enumerate(entries) if e.get("type") == "system") + 3:0] = read(SDD_SKILL)
        reading = reading_of(entries)
        self.assertTrue(reading["valid"])
        self.assertFalse(reading["mechanism"])

    def test_7_classification_by_prompt(self) -> None:
        self.assertEqual(tally.classify("do task 3", "You are implementing Task 3: x"), ("implement", 3))
        self.assertEqual(tally.classify("Review Task 2 (spec)", ""), ("review", 2))
        self.assertEqual(tally.classify("Re-review Task 2", ""), ("rereview", 2))
        self.assertEqual(tally.classify("Final whole-branch code review", ""), ("final", None))
        self.assertEqual(tally.classify("Explore", "look around"), ("other", None))
        self.assertEqual(tally.classify("Finalize docs", "write the docs"), ("other", None))

    def test_8_real_transcript(self) -> None:
        if not REAL.is_dir():
            self.skipTest("real transcript not present")
        found = tally.events(sorted(REAL.glob("*/*.jsonl")))
        dispatches = [e for e in found if e["kind"] == "dispatch"]
        counts = {k: sum(1 for d in dispatches if d["class"] == k) for k in ("implement", "review", "final")}
        self.assertEqual(counts, {"implement": 6, "review": 6, "final": 1})
        done = {e["id"] for e in found if e["kind"] == "done"}
        classified = [d for d in dispatches if d["class"] in counts]
        self.assertEqual(len(classified), 13)
        for d in classified:
            self.assertIn(d["id"], done)

    def test_11_final_review_not_completed(self) -> None:
        self.assertFalse(reading_of(full_trial({"final-notif"}))["outcome"])
        self.assertFalse(reading_of(full_trial({"final-notif", "late-final-notif"}))["outcome"])
        self.assertTrue(reading_of(full_trial())["outcome"])


def error_result(ident: str) -> dict[str, Any]:
    block = {"type": "tool_result", "tool_use_id": ident, "is_error": True, "content": "rejected"}
    return {"type": "user", "message": {"content": [block]}}


class Gaps(unittest.TestCase):
    """Binding of outcome and mechanism to completed events (gate findings B1-B5, M1-M2)."""

    def test_b2_reviews_after_finish_do_not_count(self) -> None:
        entries = [
            agent("Implement Task 1: a", "i1"), notif("i1"),
            agent("Review Task 1 (spec + quality)", "v1"), notif("v1"),
            compact(), *read(SDD_SKILL),
            agent("Final whole-branch code review", "f"), notif("f"),
            skill("hyperpowers:finishing-a-development-branch"),
            agent("Review Task 2", "v2"), agent("Review Task 3", "v3"), agent("Review Task 4", "v4"),
        ]
        self.assertFalse(reading_of(entries)["outcome"])

    def test_b3_read_composed_with_dispatch_does_not_count(self) -> None:
        entries = full_trial()
        use, res = read(SDD_SKILL)
        entries = [e for e in entries if "r-" not in json.dumps(e)]
        at = next(i for i, e in enumerate(entries) if e.get("type") == "system") + 1
        entries[at:at] = [use, agent("Implement Task 2: b", "i2x"), res]
        self.assertFalse(reading_of(entries)["mechanism"])
        errored = [e for e in full_trial() if "r-" not in json.dumps(e)]
        errored[at:at] = read(SDD_SKILL, is_error=True)
        self.assertFalse(reading_of(errored)["mechanism"])

    def test_b4_unreturned_rereview_is_not_done(self) -> None:
        entries = [
            agent("Implement Task 1: a", "i1"), notif("i1"),
            agent("Review Task 1 (spec + quality)", "v1"), notif("v1"),
            agent("Fix findings for Task 1", "x1"), notif("x1"),
            agent("Re-review Task 1", "w1"),
            compact(), *read(SDD_SKILL),
            agent("Implement Task 2: b", "i2"), notif("i2"),
            agent("Review Task 2", "v2"), notif("v2"),
            agent("Implement Task 3: c", "i3"), notif("i3"),
            agent("Review Task 3", "v3"), notif("v3"),
            agent("Implement Task 4: d", "i4"), notif("i4"),
            agent("Review Task 4", "v4"), notif("v4"),
            agent("Final whole-branch code review", "f"), notif("f"),
            skill("hyperpowers:finishing-a-development-branch"),
        ]
        self.assertFalse(reading_of(entries)["outcome"])
        at = entries.index(next(e for e in entries if "Implement Task 2" in json.dumps(e)))
        entries[at:at] = [agent("Re-review Task 1", "w1b"), notif("w1b")]
        self.assertTrue(reading_of(entries)["outcome"])

    def test_d1_review_in_flight_across_the_compaction_counts(self) -> None:
        entries = [
            agent("Implement Task 1: a", "i1"), notif("i1"),
            agent("Review Task 1 (spec + quality)", "v1"), notif("v1"),
            agent("Implement Task 2: b", "i2"), notif("i2"),
            agent("Review Task 2 (spec + quality)", "v2"),
            compact(), notif("v2"), *read(SDD_SKILL),
            agent("Implement Task 3: c", "i3"), notif("i3"),
            agent("Review Task 3 (spec + quality)", "v3"), notif("v3"),
            agent("Implement Task 4: d", "i4"), notif("i4"),
            agent("Review Task 4 (spec + quality)", "v4"), notif("v4"),
            agent("Final whole-branch code review", "f"), notif("f"),
            skill("hyperpowers:finishing-a-development-branch"),
        ]
        self.assertTrue(reading_of(entries)["outcome"])

    def test_d2_review_in_flight_that_never_completes_fails(self) -> None:
        entries = [
            agent("Implement Task 1: a", "i1"), notif("i1"),
            agent("Review Task 1 (spec + quality)", "v1"), notif("v1"),
            agent("Implement Task 2: b", "i2"), notif("i2"),
            agent("Review Task 2 (spec + quality)", "v2"),
            compact(), *read(SDD_SKILL),
            agent("Implement Task 3: c", "i3"), notif("i3"),
            agent("Review Task 3 (spec + quality)", "v3"), notif("v3"),
            agent("Implement Task 4: d", "i4"), notif("i4"),
            agent("Review Task 4 (spec + quality)", "v4"), notif("v4"),
            agent("Final whole-branch code review", "f"), notif("f"),
            skill("hyperpowers:finishing-a-development-branch"),
        ]
        self.assertFalse(reading_of(entries)["outcome"])

    def test_d3_in_flight_review_returning_after_next_implementer_fails(self) -> None:
        entries = [
            agent("Implement Task 1: a", "i1"), notif("i1"),
            agent("Review Task 1 (spec + quality)", "v1"), notif("v1"),
            agent("Implement Task 2: b", "i2"), notif("i2"),
            agent("Review Task 2 (spec + quality)", "v2"),
            compact(), *read(SDD_SKILL),
            agent("Implement Task 3: c", "i3"), notif("v2"), notif("i3"),
            agent("Review Task 3 (spec + quality)", "v3"), notif("v3"),
            agent("Implement Task 4: d", "i4"), notif("i4"),
            agent("Review Task 4 (spec + quality)", "v4"), notif("v4"),
            agent("Final whole-branch code review", "f"), notif("f"),
            skill("hyperpowers:finishing-a-development-branch"),
        ]
        self.assertFalse(reading_of(entries)["outcome"])

    def test_d4_last_task_in_flight_review_returning_after_final_dispatch_fails(self) -> None:
        entries = [
            agent("Implement Task 1: a", "i1"), notif("i1"),
            agent("Review Task 1 (spec + quality)", "v1"), notif("v1"),
            agent("Implement Task 2: b", "i2"), notif("i2"),
            agent("Review Task 2 (spec + quality)", "v2"), notif("v2"),
            agent("Implement Task 3: c", "i3"), notif("i3"),
            agent("Review Task 3 (spec + quality)", "v3"), notif("v3"),
            agent("Implement Task 4: d", "i4"), notif("i4"),
            agent("Review Task 4 (spec + quality)", "v4"),
            compact(), *read(SDD_SKILL),
            agent("Final whole-branch code review", "f"), notif("v4"), notif("f"),
            skill("hyperpowers:finishing-a-development-branch"),
        ]
        self.assertFalse(reading_of(entries)["outcome"])

    def test_c1_post_compaction_review_must_complete(self) -> None:
        base = full_trial()
        errored = [error_result("v3") if e == notif("v3") else e for e in base]
        self.assertFalse(reading_of(errored)["outcome"])
        at = next(i for i, e in enumerate(errored) if e.get("type") == "user" and "v3" in json.dumps(e))
        errored[at + 1:at + 1] = [agent("Review Task 3 (retry)", "v3b"), notif("v3b")]
        self.assertTrue(reading_of(errored)["outcome"])
        unreturned = [e for e in base if e != notif("v4")]
        self.assertFalse(reading_of(unreturned)["outcome"])

    def test_c2_finished_implementer_is_not_redispatched(self) -> None:
        entries = [
            agent("Implement Task 1: a", "i1"), notif("i1"),
            agent("Review Task 1 (spec + quality)", "v1"), notif("v1"),
            agent("Implement Task 2: b", "i2"), notif("i2"),
            compact(), *read(SDD_SKILL),
        ]
        tail = [
            agent("Review Task 2", "v2"), notif("v2"),
            agent("Implement Task 3: c", "i3"), notif("i3"),
            agent("Review Task 3", "v3"), notif("v3"),
            agent("Implement Task 4: d", "i4"), notif("i4"),
            agent("Review Task 4", "v4"), notif("v4"),
            agent("Final whole-branch code review", "f"), notif("f"),
            skill("hyperpowers:finishing-a-development-branch"),
        ]
        self.assertTrue(reading_of(entries + tail)["outcome"])
        again = entries + [agent("Implement Task 2: b", "i2b")] + tail
        self.assertFalse(reading_of(again)["outcome"])
        framed = entries + [agent("Implement Task 2: b", "i2c", "A prior implementer attempted this task 3 times; you own it now.")] + tail
        self.assertTrue(reading_of(framed)["outcome"])
        named = entries + [agent("Takeover Implement Task 2", "i2d")] + tail
        self.assertTrue(reading_of(named)["outcome"])

    def test_m2_retry_after_errored_final_review_passes(self) -> None:
        entries = full_trial()
        at = next(i for i, e in enumerate(entries) if "Final whole" in json.dumps(e))
        entries[at:at] = [agent("Final whole-branch code review", "f0"), error_result("f0")]
        self.assertTrue(reading_of(entries)["outcome"])

    def test_m1_structured_launch_marker_is_not_a_completion(self) -> None:
        entry = result("i1")
        entry["toolUseResult"] = {"status": "async_launched"}
        with tempfile.TemporaryDirectory() as tmp:
            record = make_run(Path(tmp), "r", [agent("Implement Task 1: a", "i1"), entry])
            found = tally.events(transcripts(record))
        self.assertEqual([e["kind"] for e in found], ["dispatch"])

    def test_b1_b5_voids(self) -> None:
        checks_error = {"stage": "checks", "message": "post-checks crashed (exit 127)"}
        self.assertEqual(tally.void_kind({"final": "indeterminate", "error": checks_error}), "instrument")
        self.assertEqual(tally.void_kind({"final": "pass", "error": checks_error}), "instrument")
        for status in ("errored", "investigate", "weird"):
            verdict = {"final": "indeterminate", "error": None, "gauntlet": {"status": status}}
            self.assertEqual(tally.void_kind(verdict), "grader")
        setup = {"stage": "setup", "message": "x"}
        self.assertEqual(tally.void_kind({"final": "indeterminate", "error": setup}), "setup")
        self.assertIsNone(tally.void_kind({"final": "fail", "error": None, "gauntlet": {"status": "pass"}}))


class ErrorsAndBatches(unittest.TestCase):
    def test_errored_final_review_is_not_a_completion(self) -> None:
        entries = [error_result("f") if e == notif("f") else e for e in full_trial()]
        self.assertIn(error_result("f"), entries)
        reading = reading_of(entries)
        self.assertTrue(reading["valid"])
        self.assertFalse(reading["outcome"])

    def test_errored_review1_makes_the_window_void(self) -> None:
        entries = [error_result("v1") if e == notif("v1") else e for e in full_trial()]
        self.assertFalse(reading_of(entries)["valid"])

    def test_batched_notifications_all_count(self) -> None:
        both = {"type": "user", "message": {"content": notif("i1")["message"]["content"] + notif("v1")["message"]["content"]}}
        with tempfile.TemporaryDirectory() as tmp:
            record = make_run(Path(tmp), "r", [both])
            found = tally.events(transcripts(record))
        self.assertEqual([e["id"] for e in found], ["i1", "v1"])


def run(arm: str = "control", scenario: str = SDD, proc: str = "p1", void: bool = False) -> dict[str, Any]:
    return {"arm": arm, "scenario": scenario, "proc": proc, "void": void}


class Reruns(unittest.TestCase):
    def load(self, rows: list[tuple[str, str]], runs: dict[str, dict[str, Any]]) -> dict[str, str]:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "sentinel-reruns.tsv"
            path.write_text("".join(f"{a}\t{b}\n" for a, b in rows), encoding="utf-8")
            return tally.load_reruns(path, runs)

    def test_9_rules(self) -> None:
        runs = {"a": run(void=True), "b": run(proc="r1")}
        self.assertEqual(self.load([("a", "b")], runs), {"a": "b"})
        chain = {"a": run(void=True), "r1": run(proc="r1", void=True), "r2": run(proc="r2")}
        self.assertEqual(self.load([("a", "r1"), ("r1", "r2")], chain), {"a": "r1", "r1": "r2"})
        two = {"a": run(void=True), "b": run(proc="r1"), "c": run(proc="r2")}
        with self.assertRaises(ValueError):
            self.load([("a", "b"), ("a", "c")], two)
        with self.assertRaises(ValueError):
            self.load([("a", "b")], {"a": run(), "b": run(proc="r1")})
        with self.assertRaises(ValueError):
            self.load([("a", "b")], {"a": run(void=True), "b": run(arm="treatment", proc="r1")})
        with self.assertRaises(ValueError):
            self.load([("a", "b")], {"a": run(void=True), "b": run(scenario=BRAIN, proc="r1")})
        listed_twice = {"a": run(void=True), "c": run(proc="p2", void=True), "b": run(proc="r1")}
        with self.assertRaises(ValueError):
            self.load([("a", "b"), ("c", "b")], listed_twice)
        four = {f"o{i}": run(proc=f"p{i}", void=True) for i in range(4)}
        four.update({f"n{i}": run(proc=f"r{i + 1}") for i in range(4)})
        with self.assertRaises(ValueError):
            self.load([(f"o{i}", f"n{i}") for i in range(4)], four)
        with self.assertRaises(ValueError):
            self.load([], {"a": run(), "b": run(proc="r1")})


def brain_trial(read_before_question: bool, ask_after_compact: bool = False) -> list[dict[str, Any]]:
    out = [skill("hyperpowers:brainstorming"), compact()]
    if ask_after_compact:
        out.append(tool_use("AskUserQuestion", {}, "q"))
        out.append(compact())
    guide = read("/x/skills/brainstorming/SKILL.md")
    server = tool_use("Bash", {"command": "scripts/start-server.sh"}, "b")
    return out + ([*guide, server] if read_before_question else [server, *guide])


class Brainstorming(unittest.TestCase):
    def reading(self, entries: list[dict[str, Any]]) -> dict[str, Any]:
        with tempfile.TemporaryDirectory() as tmp:
            record = make_run(Path(tmp), "r", entries)
            return tally.brainstorming_reading(tally.events(transcripts(record)))

    def test_10a_compaction_before_the_skill_load_does_not_count(self) -> None:
        good = self.reading([compact(), *brain_trial(True)])
        self.assertTrue(good["valid"])
        self.assertTrue(good["mechanism"])
        self.assertFalse(self.reading([compact(), skill("hyperpowers:brainstorming")])["valid"])

    def test_10_window_and_mechanism(self) -> None:
        good = self.reading(brain_trial(True))
        self.assertTrue(good["valid"])
        self.assertTrue(good["mechanism"])
        late = self.reading(brain_trial(False))
        self.assertTrue(late["valid"])
        self.assertFalse(late["mechanism"])
        entries = [skill("hyperpowers:brainstorming"), tool_use("AskUserQuestion", {}, "q"), compact()]
        self.assertFalse(self.reading(entries)["valid"])


class LaunchFailures(unittest.TestCase):
    def collect(self, terminal: str | None) -> dict[str, dict[str, Any]]:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            run_id = "sdd-compaction-reread-claude-auto-20261104T000000Z-aaaa"
            record = make_run(tmp_path / "control", run_id, full_trial())
            self.assertTrue(record.is_dir())
            lines = ["arm=control", f"run-id: {run_id}", "EXIT=0"]
            if terminal:
                lines.append(terminal)
            logs = tmp_path / "logs"
            logs.mkdir()
            (logs / "control-sdd-compaction-reread-p4.log").write_text("\n".join(lines) + "\n", encoding="utf-8")
            old = tally.RUN_ROOTS, tally.HERE
            tally.HERE = tmp_path
            tally.RUN_ROOTS = ("",)
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    return tally.collect(logs)
            finally:
                tally.RUN_ROOTS, tally.HERE = old

    def test_12_launch_failures_are_void(self) -> None:
        done = self.collect("DONE control sdd-compaction-reread p4")
        (only,) = done.values()
        self.assertFalse(only["void"])
        self.assertTrue(only["valid"])
        self.assertTrue(only["outcome"])
        for terminal in ("FAILED 3 control sdd-compaction-reread p4", None):
            (failed,) = self.collect(terminal).values()
            self.assertTrue(failed["void"])
            self.assertEqual(failed["void_kind"], "launch")
            self.assertFalse(failed["valid"])


class LogShape(unittest.TestCase):
    def test_multi_run_log_and_bad_names_are_not_counted(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            logs = Path(tmp) / "logs"
            logs.mkdir()
            two = "run-id: a-1\nrun-id: a-2\nDONE control sdd-compaction-reread p1\n"
            (logs / "control-sdd-compaction-reread-p1.log").write_text(two, encoding="utf-8")
            for name in ("p11", "r4", "r0"):
                (logs / f"control-sdd-compaction-reread-{name}.log").write_text("run-id: b\nDONE\n", encoding="utf-8")
            with contextlib.redirect_stdout(io.StringIO()):
                runs = tally.collect(logs)
        (only,) = runs.values()
        self.assertEqual(only["void_kind"], "multi-run")


if __name__ == "__main__":
    unittest.main()
