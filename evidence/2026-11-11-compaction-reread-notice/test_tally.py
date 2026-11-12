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

    def test_unparsable_banner_leaves_the_read_and_warns(self) -> None:
        entries = [
            SDD_LOAD, compact(), tool_use("Read", {"file_path": SDD_SKILL}, "r1"), uuid_result("r1", "u1"),
            truncation("u1", "[Truncated: something new]"),
        ]
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            got = follow_cut(entries)
        self.assertEqual(got, WHOLE_CREDIT)
        self.assertIn("truncation_unparsed", err.getvalue())

    def test_other_readers_of_an_uninvoked_skill_fail_the_sentinel(self) -> None:
        path = "/p/skills/brainstorming/SKILL.md"
        for command in (
            f"cat -n {path}", f"head -50 {path}", f"sed -n '1,400p' {path}", f"tail -n 20 '{path}'",
            f"less {path}", f"more {path}", f"cd /p && head {path} | wc -l",
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
                        f"cat {SDD_SKILL} | head -50"):
            with self.subTest(command=command):
                entries = [SDD_LOAD, compact(), bash(command, "b1"), result("b1")]
                self.assertEqual(follow_cut(entries), NO_CREDIT)


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


if __name__ == "__main__":
    unittest.main()
