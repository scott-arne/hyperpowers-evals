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


def read(path: str) -> dict[str, Any]:
    return tool_use("Read", {"file_path": path}, "r-" + path)


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
        read(SDD_SKILL),
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
            read(SDD_SKILL),
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
            read(SDD_SKILL),
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
        entries = [e for e in entries if not (e.get("type") == "assistant" and e["message"]["content"][0]["name"] == "Read")]
        entries.insert(next(i for i, e in enumerate(entries) if e.get("type") == "system") + 3, read(SDD_SKILL))
        reading = reading_of(entries)
        self.assertTrue(reading["valid"])
        self.assertFalse(reading["mechanism"])

    def test_7_classification_by_prompt(self) -> None:
        self.assertEqual(tally.classify("do task 3", "You are implementing Task 3: x"), ("implement", 3))
        self.assertEqual(tally.classify("Review Task 2 (spec)", ""), ("review", 2))
        self.assertEqual(tally.classify("Re-review Task 2", ""), ("rereview", 2))
        self.assertEqual(tally.classify("Final whole-branch code review", ""), ("final", None))
        self.assertEqual(tally.classify("Explore", "look around"), ("other", None))

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
    return out + ([guide, server] if read_before_question else [server, guide])


class Brainstorming(unittest.TestCase):
    def reading(self, entries: list[dict[str, Any]]) -> dict[str, Any]:
        with tempfile.TemporaryDirectory() as tmp:
            record = make_run(Path(tmp), "r", entries)
            return tally.brainstorming_reading(tally.events(transcripts(record)))

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


if __name__ == "__main__":
    unittest.main()
