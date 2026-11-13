"""Tests for tally.py: synthetic runs plus one real turn-liveness transcript."""

from __future__ import annotations

import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

import tally

SDD = tally.SDD
NOSKILL = tally.NOSKILL
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
        # The credited Reads carry no offset, so a one-line cut at line 1
        # keeps every expectation written before reads were range-checked.
        return tally.sdd_reading(tally.events(transcripts(record)), (1, 1))


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

    def test_d5_next_implementer_dispatched_before_compaction_fails(self) -> None:
        entries = [
            agent("Implement Task 1: a", "i1"), notif("i1"),
            agent("Review Task 1 (spec + quality)", "v1"), notif("v1"),
            agent("Implement Task 2: b", "i2"), notif("i2"),
            agent("Review Task 2 (spec + quality)", "v2"),
            agent("Implement Task 3: c", "i3"), notif("i3"),
            compact(), notif("v2"), *read(SDD_SKILL),
            agent("Review Task 3 (spec + quality)", "v3"), notif("v3"),
            agent("Implement Task 4: d", "i4"), notif("i4"),
            agent("Review Task 4 (spec + quality)", "v4"), notif("v4"),
            agent("Final whole-branch code review", "f"), notif("f"),
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
            self.load([("a", "b")], {"a": run(void=True), "b": run(scenario=NOSKILL, proc="r1")})
        listed_twice = {"a": run(void=True), "c": run(proc="p2", void=True), "b": run(proc="r1")}
        with self.assertRaises(ValueError):
            self.load([("a", "b"), ("c", "b")], listed_twice)
        four = {f"o{i}": run(proc=f"p{i}", void=True) for i in range(4)}
        four.update({f"n{i}": run(proc=f"r{i + 1}") for i in range(4)})
        with self.assertRaises(ValueError):
            self.load([(f"o{i}", f"n{i}") for i in range(4)], four)
        with self.assertRaises(ValueError):
            self.load([], {"a": run(), "b": run(proc="r1")})


def follow_of(entries: list[dict[str, Any]]) -> dict[str, Any]:
    with tempfile.TemporaryDirectory() as tmp:
        record = make_run(Path(tmp), "r", entries)
        # partial_read starts at line 5, so a one-line cut at line 5 is covered
        # by it and by any whole-file read, as the pre-range expectations assume.
        return tally.compaction_follow(tally.events(transcripts(record)), (5, 5))


def partial_read(path: str, ident: str) -> list[dict[str, Any]]:
    return [tool_use("Read", {"file_path": path, "offset": 5, "limit": 50}, ident), result(ident)]


class PerCompaction(unittest.TestCase):
    load = skill("hyperpowers:subagent-driven-development")

    def test_three_compactions_the_second_unfollowed(self) -> None:
        entries = [
            self.load,
            compact(), *read(SDD_SKILL),
            compact(), agent("Implement Task 1: a", "i1"), notif("i1"),
            compact(), *partial_read(SDD_SKILL, "p"),
        ]
        got = follow_of(entries)
        self.assertEqual(got, {"compactions": 3, "followed": 2, "whole": 1})

    def test_offset_read_follows_but_is_not_whole(self) -> None:
        got = follow_of([self.load, compact(), *partial_read(SDD_SKILL, "p")])
        self.assertEqual(got, {"compactions": 1, "followed": 1, "whole": 0})

    def test_read_after_the_next_dispatch_does_not_follow(self) -> None:
        entries = [self.load, compact(), agent("Implement Task 1: a", "i1"), *read(SDD_SKILL)]
        self.assertEqual(follow_of(entries)["followed"], 0)

    def test_compaction_before_the_load_and_errored_read_do_not_count(self) -> None:
        entries = [compact(), self.load, compact(), *read(SDD_SKILL, is_error=True)]
        self.assertEqual(follow_of(entries), {"compactions": 1, "followed": 0, "whole": 0})


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
            old = tally.RUN_ROOTS, tally.HERE, tally.arm_cut
            tally.HERE = tmp_path
            tally.RUN_ROOTS = ("",)
            # arm_cut reads the manifest pins from the hyperpowers repository;
            # the test must not depend on them, and full_trial's Read is whole.
            tally.arm_cut = lambda arm: (1, 1)
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    return tally.collect(logs)
            finally:
                tally.RUN_ROOTS, tally.HERE, tally.arm_cut = old

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


def reply(text: str) -> dict[str, Any]:
    return {"type": "assistant", "message": {"content": [{"type": "text", "text": text}]}}


def read_result(ident: str) -> dict[str, Any]:
    return {"type": "user", "message": {"content": [{"type": "tool_result", "tool_use_id": ident, "content": "x"}]}}


class NoSkillTests(unittest.TestCase):
    def reading(self, entries: list[dict[str, Any]]) -> dict[str, Any]:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "t.jsonl"
            path.write_text("\n".join(json.dumps(e) for e in entries) + "\n", encoding="utf-8")
            return tally.noskill_reading(tally.events([path]))

    def test_no_compaction_is_invalid(self) -> None:
        self.assertEqual(self.reading([reply("done")])["valid"], False)

    def test_compaction_after_last_reply_is_invalid(self) -> None:
        self.assertEqual(self.reading([reply("done"), compact()])["valid"], False)

    def test_skill_before_compaction_is_invalid(self) -> None:
        entries = [tool_use("Skill", {"skill": "hyperpowers:brainstorming"}, "s1"), compact(), reply("done")]
        self.assertEqual(self.reading(entries)["valid"], False)

    def test_reading_an_uninvoked_skill_fails(self) -> None:
        path = "/p/skills/subagent-driven-development/SKILL.md"
        entries = [compact(), tool_use("Read", {"file_path": path}, "r1"), read_result("r1"), reply("done")]
        got = self.reading(entries)
        self.assertEqual((got["valid"], got["failed"]), (True, True))

    def test_cat_of_an_uninvoked_skill_fails(self) -> None:
        cmd = "cat /p/skills/brainstorming/SKILL.md"
        entries = [compact(), tool_use("Bash", {"command": cmd}, "b1"), read_result("b1"), reply("done")]
        self.assertEqual(self.reading(entries)["failed"], True)

    def test_failed_cat_is_not_a_read(self) -> None:
        cmd = "cat /p/skills/brainstorming/SKILL.md"
        error = {"type": "user", "message": {"content": [
            {"type": "tool_result", "tool_use_id": "b1", "content": "No such file", "is_error": True}]}}
        entries = [compact(), tool_use("Bash", {"command": cmd}, "b1"), error, reply("done")]
        self.assertEqual(self.reading(entries)["failed"], False)

    def test_unanswered_cat_is_not_a_read(self) -> None:
        cmd = "cat /p/skills/brainstorming/SKILL.md"
        entries = [compact(), tool_use("Bash", {"command": cmd}, "b1"), reply("done")]
        self.assertEqual(self.reading(entries)["failed"], False)

    def test_using_hyperpowers_is_exempt(self) -> None:
        path = "/p/skills/using-hyperpowers/SKILL.md"
        entries = [compact(), tool_use("Read", {"file_path": path}, "r1"), read_result("r1"), reply("done")]
        self.assertEqual(self.reading(entries)["failed"], False)

    def test_reading_notes_passes(self) -> None:
        entries = [compact(), tool_use("Read", {"file_path": "/w/notes/01-harbor.txt"}, "r1"), read_result("r1"), reply("done")]
        got = self.reading(entries)
        self.assertEqual((got["valid"], got["failed"]), (True, False))


class CoverageTests(unittest.TestCase):
    CUT = (280, 950)

    def read(self, offset: int | None, limit: int | None) -> dict[str, Any]:
        return {"kind": "read", "path": "/p/skills/subagent-driven-development/SKILL.md",
                "offset": offset, "limit": limit, "whole": offset is None and limit is None}

    def test_whole_read_covers(self) -> None:
        self.assertTrue(tally.covers_cut([self.read(None, None)], self.CUT))

    def test_tail_read_from_before_the_cut_covers(self) -> None:
        self.assertTrue(tally.covers_cut([self.read(200, None)], self.CUT))

    def test_tail_read_from_after_the_cut_does_not(self) -> None:
        self.assertFalse(tally.covers_cut([self.read(400, None)], self.CUT))

    def test_bounded_read_short_of_the_end_does_not(self) -> None:
        self.assertFalse(tally.covers_cut([self.read(1, 600)], self.CUT))

    def test_adjacent_partial_reads_cover(self) -> None:
        self.assertTrue(tally.covers_cut([self.read(250, 400), self.read(650, None)], self.CUT))

    def test_gap_between_partial_reads_does_not(self) -> None:
        self.assertFalse(tally.covers_cut([self.read(250, 300), self.read(700, None)], self.CUT))

    def test_follow_counts_only_covering_reads(self) -> None:
        found = [{"kind": "skill", "skill": "hyperpowers:subagent-driven-development"},
                 {"kind": "compact"}, self.read(400, None), {"kind": "dispatch"},
                 {"kind": "compact"}, self.read(None, None), {"kind": "dispatch"}]
        for event in found:
            if event["kind"] == "read":
                event.update(via="read", persisted=False, credited=True)
        self.assertEqual(tally.compaction_follow(found, self.CUT), {"compactions": 2, "followed": 1, "whole": 1})


SDD_LOAD = skill("hyperpowers:subagent-driven-development")
REAL_CUT = (250, 1035)
NO_CREDIT = {"compactions": 1, "followed": 0, "whole": 0}
WHOLE_CREDIT = {"compactions": 1, "followed": 1, "whole": 1}
BANNER = (
    "[Truncated: PARTIAL view \u2014 " + SDD_SKILL + ": showing lines 1-820 of 1035 total "
    "(26795 tokens, cap 25000). Call Read with offset=821 limit=820 for the next page, or Grep to find a "
    "specific section."
)


def bash(command: str, ident: str) -> dict[str, Any]:
    return tool_use("Bash", {"command": command}, ident)


def persisted_result(ident: str, as_blocks: bool = False) -> dict[str, Any]:
    """A successful Bash result Claude Code moved to a file, leaving a 2 KB preview."""
    text = (
        "<persisted-output>\nOutput too large (74.7KB). Full output saved to: /h/tool-results/b1.txt\n\n"
        "Preview (first 2KB):\n---\nname: subagent-driven-development\n"
    )
    content: Any = [{"type": "text", "text": text}] if as_blocks else text
    block = {"type": "tool_result", "tool_use_id": ident, "content": content}
    return {"type": "user", "message": {"content": [block]}}


def uuid_result(ident: str, uuid: str) -> dict[str, Any]:
    entry = result(ident)
    entry["uuid"] = uuid
    return entry


def truncation(parent: str | None, banner: str = BANNER) -> dict[str, Any]:
    """The separate entry Claude Code 2.1.317 writes after a Read it cut at the token cap."""
    return {
        "type": "attachment", "parentUuid": parent, "isSidechain": False,
        "attachment": {"type": "read_truncation_notice", "banner": banner},
    }


def follow_cut(entries: list[dict[str, Any]], cut: tuple[int, int] = REAL_CUT) -> dict[str, Any]:
    with tempfile.TemporaryDirectory() as tmp:
        record = make_run(Path(tmp), "r", entries)
        return tally.compaction_follow(tally.events(transcripts(record)), cut)


def noskill_of(entries: list[dict[str, Any]]) -> dict[str, Any]:
    with tempfile.TemporaryDirectory() as tmp:
        record = make_run(Path(tmp), "r", entries)
        return tally.noskill_reading(tally.events(transcripts(record)))


def events_of(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    with tempfile.TemporaryDirectory() as tmp:
        record = make_run(Path(tmp), "r", entries)
        return tally.events(transcripts(record))


def notes(found: list[dict[str, Any]]) -> list[str]:
    return [e["note"] for e in found if e["kind"] == "note"]


UNINVOKED = "/p/skills/brainstorming/SKILL.md"


class SeenText(unittest.TestCase):
    """Credit only the lines the session saw (F1 persisted cat, F2 truncated Read, F3 other readers)."""

    def test_persisted_cat_gets_no_sdd_credit(self) -> None:
        for as_blocks in (False, True):
            with self.subTest(as_blocks=as_blocks):
                entries = [SDD_LOAD, compact(), bash(f"cat {SDD_SKILL}", "b1"), persisted_result("b1", as_blocks)]
                self.assertEqual(follow_cut(entries), NO_CREDIT)

    def test_persisted_cat_fails_the_sentinel(self) -> None:
        for as_blocks in (False, True):
            with self.subTest(as_blocks=as_blocks):
                entries = [compact(), bash(f"cat {SDD_SKILL}", "b1"), persisted_result("b1", as_blocks), reply("done")]
                got = noskill_of(entries)
                self.assertEqual((got["valid"], got["failed"]), (True, True))

    def test_plain_cat_is_credited_as_whole(self) -> None:
        entries = [SDD_LOAD, compact(), bash(f"cat {SDD_SKILL}", "b1"), result("b1")]
        self.assertEqual(follow_cut(entries), WHOLE_CREDIT)

    def test_truncated_read_does_not_cover(self) -> None:
        entries = [
            SDD_LOAD, compact(), tool_use("Read", {"file_path": SDD_SKILL}, "r1"), uuid_result("r1", "u1"),
            truncation("u1"),
        ]
        self.assertEqual(follow_cut(entries), NO_CREDIT)

    def test_truncated_read_matched_by_path_without_parent(self) -> None:
        entries = [
            SDD_LOAD, compact(), tool_use("Read", {"file_path": SDD_SKILL}, "r1"), result("r1"), truncation(None),
        ]
        self.assertEqual(follow_cut(entries), NO_CREDIT)

    def test_truncated_read_matched_by_parent_when_the_path_differs(self) -> None:
        alias = "/alias/skills/subagent-driven-development/SKILL.md"
        entries = [
            SDD_LOAD, compact(), tool_use("Read", {"file_path": alias}, "r1"), uuid_result("r1", "u1"),
            truncation("u1"),
        ]
        self.assertEqual(follow_cut(entries), NO_CREDIT)

    def test_truncated_read_then_next_page_covers(self) -> None:
        entries = [
            SDD_LOAD, compact(), tool_use("Read", {"file_path": SDD_SKILL}, "r1"), uuid_result("r1", "u1"),
            truncation("u1"),
            tool_use("Read", {"file_path": SDD_SKILL, "offset": 821, "limit": 820}, "r2"), result("r2"),
        ]
        self.assertEqual(follow_cut(entries), {"compactions": 1, "followed": 1, "whole": 0})

    def test_truncated_read_fails_sdd_mechanism(self) -> None:
        entries = full_trial()
        at = entries.index(next(e for e in entries if "r-" in json.dumps(e))) + 2
        entries[at:at] = [truncation(None)]
        with tempfile.TemporaryDirectory() as tmp:
            record = make_run(Path(tmp), "r", entries)
            reading = tally.sdd_reading(tally.events(transcripts(record)), REAL_CUT)
        self.assertTrue(reading["valid"])
        self.assertFalse(reading["mechanism"])

    def test_unparsable_banner_removes_credit_and_warns(self) -> None:
        entries = [
            SDD_LOAD, compact(), tool_use("Read", {"file_path": SDD_SKILL}, "r1"), uuid_result("r1", "u1"),
            truncation("u1", "[Truncated: something new]"),
        ]
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            got = follow_cut(entries)
            found = events_of(entries)
        self.assertEqual(got, NO_CREDIT)
        self.assertIn("truncation_unparsed", err.getvalue())
        read_event = next(e for e in found if e["kind"] == "read")
        self.assertEqual((read_event["credited"], read_event["whole"]), (False, False))
        self.assertEqual(notes(found), ["truncation_unparsed"])

    def test_unparsable_banner_targets_the_parent_read(self) -> None:
        # The parent is the earlier whole Read; the later offset Read still
        # covers the cut, so only the parent loses its credit.
        entries = [
            SDD_LOAD, compact(),
            tool_use("Read", {"file_path": SDD_SKILL}, "r1"), uuid_result("r1", "u1"),
            tool_use("Read", {"file_path": SDD_SKILL, "offset": 200}, "r2"), uuid_result("r2", "u2"),
            truncation("u1", "[Truncated: something new]"),
        ]
        with contextlib.redirect_stderr(io.StringIO()):
            got = follow_cut(entries)
        self.assertEqual(got, {"compactions": 1, "followed": 1, "whole": 0})

    def test_unparsable_banner_without_parent_matches_by_path(self) -> None:
        other = "/x/skills/brainstorming/SKILL.md"
        entries = [
            SDD_LOAD, compact(),
            tool_use("Read", {"file_path": SDD_SKILL}, "r1"), result("r1"),
            tool_use("Read", {"file_path": other}, "r2"), result("r2"),
            truncation(None, f"[Truncated: PARTIAL view of {SDD_SKILL}, format changed]"),
        ]
        with contextlib.redirect_stderr(io.StringIO()):
            got = follow_cut(entries)
        self.assertEqual(got, NO_CREDIT)

    def test_unparsable_banner_with_nothing_to_match_takes_the_latest_credited_read(self) -> None:
        entries = [
            SDD_LOAD, compact(), tool_use("Read", {"file_path": SDD_SKILL}, "r1"), result("r1"),
            truncation("zz", "[Truncated: something new]"),
        ]
        with contextlib.redirect_stderr(io.StringIO()):
            got = follow_cut(entries)
        self.assertEqual(got, NO_CREDIT)

    def test_parsed_banner_prefers_the_parent_over_the_path(self) -> None:
        alias = "/alias/skills/subagent-driven-development/SKILL.md"
        entries = [
            SDD_LOAD, compact(),
            tool_use("Read", {"file_path": SDD_SKILL}, "r1"), uuid_result("r1", "u1"),
            tool_use("Read", {"file_path": alias}, "r2"), uuid_result("r2", "u2"),
            truncation("u2"),
        ]
        found = events_of(entries)
        reads = {e["path"]: e for e in found if e["kind"] == "read"}
        self.assertEqual((reads[SDD_SKILL]["offset"], reads[SDD_SKILL]["whole"]), (None, True))
        self.assertEqual((reads[alias]["offset"], reads[alias]["limit"], reads[alias]["whole"]), (1, 820, False))

    def test_parsed_banner_matching_no_read_removes_credit_and_is_counted(self) -> None:
        # Neither the parent link nor the path finds the Read, so the tally
        # cannot tell which lines the session saw.
        alias = BANNER.replace(SDD_SKILL, "/alias/skills/subagent-driven-development/SKILL.md")
        elsewhere = BANNER.replace(SDD_SKILL, "/w/notes/big.txt")
        for label, parent, banner in (
            ("alias path, unknown parent", "zz", alias),
            ("alias path, no parent", None, alias),
            ("no candidate at all", "zz", elsewhere),
            ("no candidate at all, no parent", None, elsewhere),
        ):
            with self.subTest(label):
                entries = [
                    SDD_LOAD, compact(), tool_use("Read", {"file_path": SDD_SKILL}, "r1"), uuid_result("r1", "u1"),
                    truncation(parent, banner),
                ]
                err = io.StringIO()
                with contextlib.redirect_stderr(err):
                    got = follow_cut(entries)
                    found = events_of(entries)
                self.assertEqual(got, NO_CREDIT)
                self.assertIn("truncation_unmatched", err.getvalue())
                read_event = next(e for e in found if e["kind"] == "read")
                self.assertEqual((read_event["credited"], read_event["whole"]), (False, False))
                self.assertEqual(notes(found), ["truncation_unmatched"])

    def test_unmatched_banner_prefers_the_read_of_the_same_skill(self) -> None:
        # The later Read of another skill is the latest credited one, but the
        # banner names the SDD skill under another path.
        alias = BANNER.replace(SDD_SKILL, "/alias/skills/subagent-driven-development/SKILL.md")
        entries = [
            SDD_LOAD, compact(),
            tool_use("Read", {"file_path": SDD_SKILL}, "r1"), uuid_result("r1", "u1"),
            tool_use("Read", {"file_path": UNINVOKED}, "r2"), uuid_result("r2", "u2"),
            truncation("zz", alias),
        ]
        with contextlib.redirect_stderr(io.StringIO()):
            got = follow_cut(entries)
            found = events_of(entries)
        self.assertEqual(got, NO_CREDIT)
        reads = {e["path"]: e for e in found if e["kind"] == "read"}
        self.assertEqual((reads[SDD_SKILL]["credited"], reads[SDD_SKILL]["whole"]), (False, False))
        self.assertEqual((reads[UNINVOKED]["credited"], reads[UNINVOKED]["whole"]), (True, True))

    def test_unmatched_banner_with_no_read_is_only_a_counted_note(self) -> None:
        entries = [SDD_LOAD, compact(), truncation("zz")]
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            found = events_of(entries)
        self.assertIn("truncation_unmatched", err.getvalue())
        self.assertEqual(notes(found), ["truncation_unmatched"])

    def test_read_run_counts_and_prints_truncation_notes(self) -> None:
        unmatched = BANNER.replace(SDD_SKILL, "/w/notes/big.txt")
        entries = [
            SDD_LOAD, compact(), tool_use("Read", {"file_path": SDD_SKILL}, "r1"), uuid_result("r1", "u1"),
            truncation("u1", "[Truncated: something new]"), truncation("zz", unmatched),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            record = make_run(Path(tmp), "r", entries)
            old = tally.run_paths, tally.arm_cut
            tally.run_paths = lambda arm, run_id: (record, transcripts(record))
            tally.arm_cut = lambda arm: REAL_CUT
            out = io.StringIO()
            try:
                with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
                    row = tally.read_run("treatment", SDD, "p1", "r")
            finally:
                tally.run_paths, tally.arm_cut = old
        self.assertEqual((row["truncation_unparsed"], row["truncation_unmatched"]), (1, 1))
        self.assertIn("truncation_unparsed=1", out.getvalue())
        self.assertIn("truncation_unmatched=1", out.getvalue())

    def test_other_readers_of_an_uninvoked_skill_fail_the_sentinel(self) -> None:
        path = "/p/skills/brainstorming/SKILL.md"
        for command in (
            f"cat -n {path}", f"head -50 {path}", f"sed -n '1,400p' {path}", f"tail -n 20 '{path}'",
            f"less {path}", f"more {path}", f"cd /p && head {path} | wc -l", f"cd /x && head -n 50 {path}",
            f"cat {path}", f"cat {path} 2>&1", f"cd /x && cat {path}", f"ls /p; cat {path} 2>/dev/null",
            f"LC_ALL=C /bin/cat {path}", f"echo start\ncat {path}", f"cat {path} # look",
            f"cat >> /w/progress.md <<'EOF'\nnote\nEOF\nhead -n 40 {path}",
            f"cat <<-EOF > /w/n.md\n\tx\n\tEOF\ncat {path}",
        ):
            with self.subTest(command=command):
                got = noskill_of([compact(), bash(command, "b1"), result("b1"), reply("done")])
                self.assertEqual((got["valid"], got["failed"]), (True, True))

    def test_non_reading_commands_do_not_fail_the_sentinel(self) -> None:
        path = "/p/skills/brainstorming/SKILL.md"
        for command in (f"wc -l {path}", f"ls {path}", f"concatenate {path}", f"sed -i s/a/b/ {path}"):
            with self.subTest(command=command):
                got = noskill_of([compact(), bash(command, "b1"), result("b1"), reply("done")])
                self.assertEqual((got["valid"], got["failed"]), (True, False))

    def test_other_readers_of_the_sdd_skill_get_no_sdd_credit(self) -> None:
        for command in (f"head {SDD_SKILL}", f"cat -n {SDD_SKILL}", f"sed -n '1,2000p' {SDD_SKILL}",
                        f"cat {SDD_SKILL} | head -50", f"cd /x && cat {SDD_SKILL}", f"cat /x/a.md {SDD_SKILL}",
                        f"LC_ALL=C cat {SDD_SKILL}", f"cat {SDD_SKILL} 2>/dev/null", f"cat {SDD_SKILL}; ls"):
            with self.subTest(command=command):
                entries = [SDD_LOAD, compact(), bash(command, "b1"), result("b1")]
                self.assertEqual(follow_cut(entries), NO_CREDIT)

    def test_plain_cat_with_stderr_merged_is_credited(self) -> None:
        for command in (f"cat {SDD_SKILL} 2>&1", f"cat '{SDD_SKILL}'", f'  cat "{SDD_SKILL}"  '):
            with self.subTest(command=command):
                entries = [SDD_LOAD, compact(), bash(command, "b1"), result("b1")]
                self.assertEqual(follow_cut(entries), WHOLE_CREDIT)

    def test_mentions_and_hidden_output_are_not_reads(self) -> None:
        # None of these shows the file to the session, so none is SDD
        # coverage, and none is a sentinel read either.
        for template in (
            "echo cat {p}", "printf '%s' cat {p}", "cat {p} >/dev/null", "cat {p} > /tmp/x", "cat {p} >> /tmp/x",
            "cat {p} &> /tmp/x", "cat {p} >| /tmp/x", "cat {p} 1>/tmp/x", "x=$(cat {p})", "y=`cat {p}`",
            "echo \"$(cat {p})\" >/dev/null", 'git commit -m "cat {p}"', "git commit -m 'head {p}'",
            "cat {p} 'unbalanced", 'cat "{p}', "x=$(cat {p}", "y=`cat {p}", "echo '\ncat {p}'",
            "sed -i s/a/b/ {p}", "grep -n cat {p}", "cat --help # {p}",
            "cat > /tmp/n <<'EOF'\ncat {p}\nEOF", "cat <<EOF\ncat {p}", "cat {p} <<", "cat {p} <<EOF",
        ):
            for path in (SDD_SKILL, UNINVOKED):
                command = template.format(p=path)
                with self.subTest(command=command):
                    entries = [SDD_LOAD, compact(), bash(command, "b1"), result("b1")]
                    self.assertEqual(follow_cut(entries), NO_CREDIT)
                    got = noskill_of([compact(), bash(command, "b1"), result("b1"), reply("done")])
                    self.assertEqual((got["valid"], got["failed"]), (True, False))

    def test_every_reader_in_a_compound_command_is_seen(self) -> None:
        invoked = "/p/skills/subagent-driven-development/SKILL.md"
        entries = [
            skill("hyperpowers:subagent-driven-development"), compact(),
            bash(f"cat {invoked}; head {UNINVOKED}", "b1"), result("b1"), reply("done"),
        ]
        found = events_of(entries)
        self.assertEqual(
            [(e["path"], e["via"]) for e in found if e["kind"] == "read"],
            [(invoked, "bash-other"), (UNINVOKED, "bash-other")],
        )


class RerunsTests(unittest.TestCase):
    def load(self, text: str) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "sentinel-reruns.tsv"
            path.write_text(text, encoding="utf-8")
            tally.load_reruns(path, {})

    def test_comment_only_file_loads(self) -> None:
        self.load("# original-run-id<TAB>replacement-run-id\n")

    def test_one_field_row_is_refused(self) -> None:
        with self.assertRaisesRegex(ValueError, "line 2: expected two"):
            self.load("# header\nonly-one\n")

    def test_three_field_row_is_refused(self) -> None:
        with self.assertRaisesRegex(ValueError, "line 1: expected two"):
            self.load("a\tb\tc\n")

    def test_empty_field_row_is_refused(self) -> None:
        with self.assertRaisesRegex(ValueError, "line 1: expected two"):
            self.load("a\t\n")


class LogNameTests(unittest.TestCase):
    def test_shipped_arm_and_noskill_scenario_parse(self) -> None:
        self.assertIsNotNone(tally.LOG_NAME.match("shipped-sdd-compaction-reread-p1"))
        self.assertIsNotNone(tally.LOG_NAME.match("treatment-compaction-no-skill-r2"))
        self.assertIsNone(tally.LOG_NAME.match("fork-sdd-compaction-reread-p1"))


class BarTests(unittest.TestCase):
    def test_per_compaction_rate_pools_valid_runs(self) -> None:
        runs = [{"valid": True, "compactions": 10, "followed": 9}, {"valid": True, "compactions": 10, "followed": 8},
                {"valid": False, "compactions": 10, "followed": 0}]
        self.assertAlmostEqual(tally.pooled_rate(runs), 0.85)

    def test_median_compactions(self) -> None:
        runs = [{"valid": True, "compactions": c} for c in (7, 12, 13, 14, 16, 16, 17, 18, 18, 20)]
        self.assertEqual(tally.median_compactions(runs), 16)


SID = "s1"
SETUP = [(f"session:{SID}", "setup complete")]


class StepState(unittest.TestCase):
    def test_rows(self) -> None:
        cases = [
            ([], "setup.md"),
            ([("1", "branch")], "setup.md"),
            ([("session:other", "setup complete")], "setup.md"),
            ([("session:$CLAUDE_CODE_SESSION_ID", "setup complete")], "task-loop.md"),
            ([("session:%s", "setup complete")], "task-loop.md"),
            (SETUP, "task-loop.md"),
            (SETUP + [("1", "branch"), ("1", "implementer")], "task-loop.md"),
            (SETUP + [("1", "branch"), ("1", "report")], "task-loop.md"),
            (SETUP + [("1", "branch"), ("1", "review approved")], "review-and-complete.md"),
            (SETUP + [("1", "branch"), ("1", "gate approved")], "review-and-complete.md"),
            (SETUP + [("1", "branch"), ("1", "approved")], "review-and-complete.md"),
            (SETUP + [("1", "branch"), ("1", "merged")], "review-and-complete.md"),
            (SETUP + [("1", "branch"), ("1", "review blocking")], "fix-loop.md"),
            (SETUP + [("1", "branch"), ("1", "gate blocking")], "fix-loop.md"),
            (SETUP + [("1", "branch"), ("1", "fix round")], "fix-loop.md"),
            (SETUP + [("1", "branch"), ("1", "complete")], "task-loop.md"),
            (SETUP + [(str(t), w) for t in range(1, 5) for w in ("branch", "complete")], "final-and-finish.md"),
            (SETUP + [("final", "branch")], "final-and-finish.md"),
        ]
        for lines, want in cases:
            with self.subTest(lines=lines):
                self.assertEqual(tally.step_state(lines, 4, SID), want)

    def test_held_task(self) -> None:
        self.assertEqual(tally.held_task(SETUP + [("1", "branch"), ("1", "complete"), ("2", "branch")]), "2")
        self.assertIsNone(tally.held_task(SETUP + [("1", "branch"), ("1", "complete")]))


class LedgerParse(unittest.TestCase):
    def test_heredoc_and_printf_lines(self) -> None:
        cmd = "cat >> /w/progress.md <<'EOF'\nTask 2: review blocking a1 (sonnet) two findings\nEOF"
        self.assertEqual(tally.ledger_lines(cmd), [("2", "review blocking")])
        cmd = "printf 'Task 3: codex gate round 1 approved clean\\n' >> /w/progress.md"
        self.assertEqual(tally.ledger_lines(cmd), [("3", "gate approved")])
        cmd = "printf 'session abc: setup complete\\n' >> /w/progress.md"
        self.assertEqual(tally.ledger_lines(cmd), [("session:abc", "setup complete")])

    def test_sdd_state_calls(self) -> None:
        self.assertEqual(tally.ledger_lines("bash scripts/sdd-state claim plan.md 2 --session s"), [("2", "branch")])
        self.assertEqual(tally.ledger_lines("scripts/sdd-state claim plan.md final --session s"), [("final", "branch")])
        self.assertEqual(tally.ledger_lines("scripts/sdd-state merge-back plan.md 2"), [("2", "merged")])
        self.assertEqual(tally.ledger_lines("scripts/sdd-state complete plan.md 2 --commits a..b"), [("2", "complete")])
        self.assertEqual(tally.ledger_lines("scripts/sdd-state board plan.md"), [])

    def test_failed_call_writes_nothing(self) -> None:
        e = tally.bash_event("printf 'Task 1: report DONE x\\n' >> /w/progress.md", ok=False, output="")
        self.assertEqual((e["ledger_lines"], e["governed"]), ([], True))


STEP = "/arms/slice/skills/subagent-driven-development"
BOARD_OUT = "status=board sync=offline sessions=1\nheld task=1 owner=s1"
SETUP_LINE = f"session {SID}: setup complete"


class StepFollow(unittest.TestCase):
    def setUp(self) -> None:
        tally.STEP_LINES = {f: 10 for f in tally.STEP_FILES}

    def follow(self, after: list[dict], before: list[dict] | None = None) -> dict:
        found = [{"kind": "skill", "skill": "hyperpowers:subagent-driven-development"}]
        if before is None:
            before = [tally.bash_event(f"printf '{SETUP_LINE}\\n' >> /w/progress.md", ok=True, output="")]
        found += before + [{"kind": "compact"}] + after + [{"kind": "dispatch", "class": "implement", "task": 1}]
        return tally.step_follows(found, SID)

    def read(self, name: str) -> dict:
        return {"kind": "read", "path": f"{STEP}/{name}", "offset": None, "limit": None,
                "whole": True, "via": "read", "persisted": False, "credited": True}

    def board(self, ok: bool = True) -> dict:
        return tally.bash_event("scripts/sdd-state board plan.md", ok=ok, output=BOARD_OUT if ok else "")

    def grep(self, output: str = SETUP_LINE) -> dict:
        return tally.bash_event("grep -E '^(session s1: setup complete)' /w/progress.md", ok=True, output=output)

    def test_followed(self) -> None:
        r = self.follow([self.board(), self.grep(), self.read("task-loop.md")])
        self.assertEqual((r["compactions"], r["followed"]), (1, 1))

    def test_wrong_file(self) -> None:
        r = self.follow([self.board(), self.grep(), self.read("fix-loop.md")])
        self.assertEqual((r["followed"], r["any_step"]), (0, 1))

    def test_skill_only(self) -> None:
        r = self.follow([self.board(), self.grep(), {**self.read("x"), "path": f"{STEP}/SKILL.md"}])
        self.assertEqual((r["followed"], r["skill"]), (0, 1))

    def test_ledger_parts_skipped(self) -> None:
        r = self.follow([self.read("task-loop.md")])
        self.assertEqual((r["followed"], r["ledger_parts"]), (0, 0))

    def test_failed_board_earns_nothing(self) -> None:
        r = self.follow([self.board(ok=False), self.grep(), self.read("task-loop.md")])
        self.assertEqual(r["followed"], 0)

    def test_grep_without_the_setup_line_earns_nothing(self) -> None:
        r = self.follow([self.board(), self.grep(output="no match"), self.read("task-loop.md")])
        self.assertEqual(r["followed"], 0)

    def test_grep_must_show_the_held_task(self) -> None:
        before = [
            tally.bash_event(f"printf '{SETUP_LINE}\\n' >> /w/progress.md", ok=True, output=""),
            tally.bash_event("scripts/sdd-state claim plan.md 1 --session s1", ok=True, output="status=claimed"),
        ]
        r = self.follow([self.board(), self.grep(), self.read("task-loop.md")], before=before)
        self.assertEqual(r["followed"], 0)
        r = self.follow([self.board(), self.grep(output=SETUP_LINE + "\nTask 1: branch t1"), self.read("task-loop.md")],
                        before=before)
        self.assertEqual(r["followed"], 1)

    def test_no_ledger_needs_only_setup(self) -> None:
        r = self.follow([self.read("setup.md")], before=[])
        self.assertEqual(r["followed"], 1)

    def test_partial_read_without_a_line_count_fails_closed(self) -> None:
        tally.STEP_LINES = {}
        partial = {**self.read("task-loop.md"), "offset": 1, "limit": 5, "whole": False}
        r = self.follow([self.board(), self.grep(), partial])
        self.assertEqual(r["followed"], 0)

    def test_governed_action_stops_the_window(self) -> None:
        r = self.follow([tally.bash_event("printf 'Task 1: report DONE x\\n' >> /w/progress.md", ok=True, output=""),
                         self.board(), self.grep(), self.read("task-loop.md")])
        self.assertEqual(r["followed"], 0)


THRASH_ENTRY = {
    "type": "assistant",
    "message": {
        "model": "<synthetic>",
        "content": [{"type": "text", "text": "Autocompact is thrashing: the context refilled to the limit."}],
    },
}
AGENT_FAILED = [{"phase": "post", "check": "tool-called", "passed": False}]


def revision_row(
    arm: str, entries: list[dict[str, Any]], final: str = "pass", checks: list[dict[str, Any]] | None = None
) -> tuple[dict[str, Any], str]:
    """Read one synthetic run as a revision arm; returns its row and the printed line."""
    with tempfile.TemporaryDirectory() as tmp:
        record = make_run(Path(tmp), "r", entries, final=final, checks=checks)
        old = tally.run_paths
        tally.run_paths = lambda arm, run_id: (record, transcripts(record))
        out = io.StringIO()
        try:
            with contextlib.redirect_stdout(out):
                row = tally.read_run(arm, SDD, "p1", "r")
        finally:
            tally.run_paths = old
    return row, out.getvalue()


class RevisionRuns(unittest.TestCase):
    def test_thrash_stop_is_a_valid_failure(self) -> None:
        entries = [SDD_LOAD, compact(), *read(SDD_SKILL), compact(), THRASH_ENTRY]
        for arm in ("baseline-6181", "slice"):
            with self.subTest(arm=arm):
                row, line = revision_row(arm, entries, final="fail", checks=AGENT_FAILED)
                self.assertEqual((row["thrash"], row["valid"], row["outcome"]), (1, True, False))
                self.assertIn("thrash=1", line)
                self.assertEqual(row["compactions"], 2)

    def test_thrash_fails_an_otherwise_passing_run(self) -> None:
        entries = [SDD_LOAD, compact(), agent("Implement Task 1: a", "i1"), notif("i1"), compact(), THRASH_ENTRY]
        for arm in ("baseline-6181", "slice"):
            with self.subTest(arm=arm):
                row, line = revision_row(arm, entries)
                self.assertEqual((row["valid"], row["thrash"], row["outcome"]), (True, 1, False))
                self.assertEqual(row["classes"]["implement"], 1)
                self.assertIn("outcome=False", line)

    def test_passing_verdict_without_a_dispatch_fails_the_outcome(self) -> None:
        row, _ = revision_row("slice", [SDD_LOAD, compact(), reply("done")])
        self.assertEqual((row["valid"], row["void_kind"], row["outcome"], row["thrash"]), (True, None, False, 0))

    def test_passing_verdict_with_an_implement_dispatch_passes(self) -> None:
        row, _ = revision_row("slice", [SDD_LOAD, compact(), agent("Implement Task 1: a", "i1"), notif("i1")])
        self.assertEqual((row["valid"], row["outcome"]), (True, True))

    def test_no_compaction_after_the_skill_load_is_void(self) -> None:
        entries = [compact(), SDD_LOAD, agent("Implement Task 1: a", "i1"), notif("i1")]
        row, line = revision_row("slice", entries)
        self.assertEqual((row["void_kind"], row["valid"], row["outcome"]), ("no-compaction", False, None))
        self.assertIn("void=no-compaction", line)

    def test_errored_bash_result_is_a_failed_bash_event(self) -> None:
        cmd = "printf 'Task 1: report DONE x\\n' >> /w/progress.md"
        found = events_of([bash(cmd, "b1"), result("b1", is_error=True)])
        (event,) = [e for e in found if e["kind"] == "bash"]
        self.assertEqual((event["ok"], event["ledger_lines"], event["governed"]), (False, [], True))
        found = events_of([bash(cmd, "b2"), result("b2")])
        (event,) = [e for e in found if e["kind"] == "bash"]
        self.assertEqual((event["ok"], event["ledger_lines"], event["output"]), (True, [("1", "report")], "text"))

    def test_transcript_session(self) -> None:
        entries = [{**SDD_LOAD, "sessionId": "abc-1"}, {**compact(), "sessionId": "abc-1"}]
        with tempfile.TemporaryDirectory() as tmp:
            record = make_run(Path(tmp), "r", entries)
            self.assertEqual(tally.transcript_session(transcripts(record)), "abc-1")


class RevisionPlumbing(unittest.TestCase):
    def with_here(self, manifest: str, logs: dict[str, str]) -> tempfile.TemporaryDirectory[str]:
        tmp = tempfile.TemporaryDirectory()
        here = Path(tmp.name)
        (here / "manifest.tsv").write_text(manifest, encoding="utf-8")
        (here / "logs").mkdir()
        for name, text in logs.items():
            (here / "logs" / name).write_text(text, encoding="utf-8")
        old = tally.HERE
        tally.HERE = here
        self.addCleanup(setattr, tally, "HERE", old)
        self.addCleanup(tmp.cleanup)
        return tmp

    def test_manifest_pins_reads_the_revision_arms(self) -> None:
        self.with_here("harness\th\ncontrol\tc\nbaseline-6181\tb6\nslice\tsl\nmodel\tm\n", {})
        pins = tally.manifest_pins()
        self.assertEqual((pins["baseline-6181"], pins["slice"], pins["control"]), ("b6", "sl", "c"))
        self.assertNotIn("model", pins)

    def test_main_refuses_a_slice_log_without_a_slice_pin(self) -> None:
        self.with_here("baseline-6181\tb6\n", {"slice-sdd-compaction-reread-p1.log": "run-id: x\nDONE\n"})
        old_argv = sys.argv
        sys.argv = ["tally.py"]
        err = io.StringIO()
        try:
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(err):
                code = tally.main()
        finally:
            sys.argv = old_argv
        self.assertEqual(code, 1)
        self.assertIn("slice", err.getvalue())

    def test_log_names(self) -> None:
        for name in ("baseline-6181-p1", "baseline-6181-sdd-compaction-reread-r1", "slice-compaction-no-skill-p10"):
            with self.subTest(name=name):
                self.assertIsNotNone(tally.LOG_NAME.match(name))
        for name in ("slice-sdd-compaction-reread-r4", "baseline-6181-p11", "baseline-6181-sdd-compaction-reread-p1"):
            with self.subTest(name=name):
                self.assertIsNone(tally.LOG_NAME.match(name))

    def test_collect_maps_baseline_logs_and_each_mode_reads_its_own_arms(self) -> None:
        tmp = self.with_here("", {
            "baseline-6181-p1.log": "run-id: b1\nDONE baseline-6181 p1\n",
            "control-sdd-compaction-reread-p1.log": "run-id: c1\nDONE control sdd-compaction-reread p1\n",
        })
        here = Path(tmp.name)
        make_run(here / "results", "b1", [SDD_LOAD, compact()])
        old = tally.RUN_ROOTS, tally.EVALS, tally.arm_cut
        tally.RUN_ROOTS, tally.EVALS = (), here
        tally.arm_cut = lambda arm: (1, 1)
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                revision = tally.collect(here / "logs", revision=True)
                waves = tally.collect(here / "logs")
        finally:
            tally.RUN_ROOTS, tally.EVALS, tally.arm_cut = old
        (row,) = revision.values()
        self.assertEqual((row["arm"], row["scenario"], row["proc"], row["run"]), ("baseline-6181", SDD, "p1", "b1"))
        self.assertEqual([r["arm"] for r in waves.values()], ["control"])


def revision_cell(arm: str, scenario: str, n: int, **fields: Any) -> dict[str, dict[str, Any]]:
    rows = {}
    for k in range(n):
        rows[f"{arm}-{scenario}-{k}"] = {
            "run": f"{arm}-{scenario}-{k}", "arm": arm, "scenario": scenario, "proc": f"p{k + 1}",
            "void": False, "void_kind": None, "valid": True, **fields,
        }
    return rows


class RevisionSummary(unittest.TestCase):
    def test_nine_valid_runs_read_incomplete(self) -> None:
        runs = {
            **revision_cell("baseline-6181", SDD, 10, outcome=False, thrash=1, compactions=9, followed=0),
            **revision_cell("slice", SDD, 9, outcome=True, thrash=0, compactions=5, followed=5,
                            any_step=5, ledger_parts=5, skill=5),
            **revision_cell("slice", NOSKILL, 10, failed=False, reads=[]),
        }
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            tally.summarize_revision(runs, set())
        lines = out.getvalue().splitlines()
        (cell,) = [line for line in lines if line.startswith(f"slice {SDD}:")]
        self.assertIn("valid=9", cell)
        self.assertIn("incomplete", cell)
        (baseline,) = [line for line in lines if line.startswith(f"baseline-6181 {SDD}:")]
        self.assertNotIn("incomplete", baseline)
        self.assertIn("thrash=10", baseline)
        bars = [line for line in lines if line.rstrip().endswith(("PASS", "FAIL", "incomplete")) and "(" in line
                and not line.startswith(("slice ", "baseline-6181 "))]
        self.assertEqual(len(bars), 5)
        self.assertEqual([b.rsplit(" ", 1)[1] for b in bars],
                         ["incomplete", "incomplete", "incomplete", "incomplete", "PASS"])

    def test_complete_cells_read_each_bar(self) -> None:
        runs = {
            **revision_cell("baseline-6181", SDD, 10, outcome=False, thrash=1, compactions=9, followed=0),
            **revision_cell("slice", SDD, 10, outcome=True, thrash=0, compactions=20, followed=17,
                            any_step=20, ledger_parts=17, skill=3),
            **revision_cell("slice", NOSKILL, 10, failed=True, reads=["/p/skills/x/SKILL.md"]),
        }
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            tally.summarize_revision(runs, set())
        text = out.getvalue()
        bars = [line.rsplit(" ", 1)[1] for line in text.splitlines()
                if line.rstrip().endswith(("PASS", "FAIL", "incomplete"))
                and not line.startswith(("slice ", "baseline-6181 "))]
        # 17 of 20 is exactly 85%; a median of 20 compactions exceeds 16.
        self.assertEqual(bars, ["PASS", "PASS", "PASS", "FAIL", "FAIL"])


if __name__ == "__main__":
    unittest.main()
