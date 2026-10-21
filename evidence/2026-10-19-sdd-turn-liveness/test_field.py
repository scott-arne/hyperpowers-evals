"""Tests for field.py on synthetic transcripts."""

from __future__ import annotations

import sys
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import field
from synth import (
    AGENT_BG,
    BASH_BG,
    RELOAD_RESULT,
    assistant,
    enqueue,
    human,
    result,
    write,
)

SINCE = datetime(2026, 10, 20, 0, 0, tzinfo=UTC)
UNTIL = datetime(2026, 10, 21, 0, 0, tzinfo=UTC)
SDD = ("s1", "Skill", {"skill": "hyperpowers:subagent-driven-development"})


def session() -> list[dict[str, Any]]:
    return [
        human(0, "Execute the plan.", entrypoint="sdk-ts"),
        assistant(5, tools=[SDD]),
        result(6, "s1", "Launching skill"),
        assistant(10, tools=[("k1", "TaskCreate", {"subject": "A"})]),
        result(11, "k1", "Task #1 created successfully: A"),
        assistant(12, tools=[("k2", "TaskCreate", {"subject": "B"})]),
        result(13, "k2", "Task #2 created successfully: B"),
        assistant(100, tools=[("u1", "TaskUpdate", {"taskId": "1", "status": "completed"})]),
        result(101, "u1", "Updated task #1 status"),
        assistant(110, "Task 1 is done. Moving to Task 2."),
        human(500, "Resume"),
        assistant(510, tools=[("a1", "Agent", {"description": "Implement Task 2"})]),
        result(511, "a1", AGENT_BG),
        assistant(520, "Waiting for the implementer."),
        human(600, "Resume"),
        enqueue(700, "a1"),
        assistant(710, tools=[("b1", "Bash", {"command": "python3 -m unittest", "run_in_background": True})]),
        result(711, "b1", BASH_BG),
        assistant(720, "Started the suite."),
        human(800, "Resume"),
        assistant(850, tools=[("z1", "Bash", {"command": "ls"})]),
        result(900, "z1", RELOAD_RESULT, is_error=True),
        assistant(901, "No response requested."),
        human(902, "Resume"),
        assistant(1000, tools=[("u2", "TaskUpdate", {"taskId": "2", "status": "completed"})]),
        result(1001, "u2", "Updated task #2 status"),
        assistant(1010, "All done. Ready to merge?"),
    ]


class Collect(unittest.TestCase):
    def test_counts_one_zed_sdd_session(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp)
            write(projects / "p1" / "zed.jsonl", session())
            cli = session()
            cli[0] = human(0, "Execute the plan.", entrypoint="cli")
            write(projects / "p1" / "cli.jsonl", cli)
            write(projects / "p2" / "nosdd.jsonl", [human(0, "hello", entrypoint="sdk-ts"), assistant(5, "Hi.")])
            out = field.collect(projects, SINCE, UNTIL)
        self.assertEqual(out["sessions"], 1)
        self.assertEqual(out["boundaries"], 2)
        self.assertEqual((out["premature"], out["premature_resumed"]), (1, 1))
        self.assertEqual((out["live_turn_ends"], out["live_resumes"]), (1, 1))
        self.assertEqual((out["censored_stops"], out["censored_resumes"]), (1, 1))
        self.assertEqual(out["excluded"], {"reload": 1})
        self.assertEqual(out["premature_per_100"], 50.0)
        self.assertEqual(out["cc_versions"], {"2.1.300": 1})

    def test_window_bounds_the_events(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp)
            write(projects / "p1" / "zed.jsonl", session())
            early = datetime(2026, 10, 20, 10, 5, tzinfo=UTC)
            out = field.collect(projects, SINCE, early)
        self.assertEqual((out["boundaries"], out["premature"], out["live_turn_ends"]), (1, 1, 0))

    def test_censored_work_dominates_live_work(self) -> None:
        # The implementer will finish; the background shell never records a completion.
        overlap = [
            human(0, "Execute the plan.", entrypoint="sdk-ts"),
            assistant(5, tools=[SDD]),
            result(6, "s1", "Launching skill"),
            assistant(10, tools=[("k1", "TaskCreate", {"subject": "A"})]),
            result(11, "k1", "Task #1 created successfully: A"),
            assistant(20, tools=[("a1", "Agent", {"description": "Implement Task 1"})]),
            result(21, "a1", AGENT_BG),
            assistant(22, tools=[("b1", "Bash", {"command": "sleep 900", "run_in_background": True})]),
            result(23, "b1", BASH_BG),
            assistant(30, "Waiting for the implementer."),
            human(40, "Resume"),
            enqueue(300, "a1"),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp)
            write(projects / "p1" / "zed.jsonl", overlap)
            out = field.collect(projects, SINCE, UNTIL)
        self.assertEqual((out["censored_stops"], out["censored_resumes"]), (1, 1))
        self.assertEqual((out["live_turn_ends"], out["live_resumes"], out["premature"]), (0, 0, 0))

    def test_failed_task_updates_change_nothing(self) -> None:
        failed = [
            human(0, "Execute the plan.", entrypoint="sdk-ts"),
            assistant(5, tools=[SDD]),
            result(6, "s1", "Launching skill"),
            assistant(10, tools=[("k1", "TaskCreate", {"subject": "A"})]),
            result(11, "k1", "Task #1 created successfully: A"),
            assistant(20, tools=[("u1", "TaskUpdate", {"taskId": "1", "status": "completed"})]),
            result(21, "u1", "Task not found", is_error=True),
            assistant(30, "Moving on."),
            human(40, "Resume"),
            assistant(50, tools=[("u2", "TaskUpdate", {"taskId": "7", "status": "in_progress"})]),
            result(51, "u2", "Task not found", is_error=True),
            assistant(60, tools=[("u3", "TaskUpdate", {"taskId": "1", "status": "completed"})]),
            result(61, "u3", "Updated task #1 status"),
            assistant(70, "All done."),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp)
            write(projects / "p1" / "zed.jsonl", failed)
            out = field.collect(projects, SINCE, UNTIL)
        # The stop at 30 is premature (task 1 is still open); the one at 70 is not (task 7 never opened).
        self.assertEqual((out["premature"], out["premature_resumed"], out["boundaries"]), (1, 1, 1))


class Reflog(unittest.TestCase):
    TEXT = (
        "f1fd935 HEAD@{2026-10-19T10:35:52-07:00}: checkout: moving from 37abdbc to v6.16.1\n"
        "37abdbc HEAD@{2026-10-10T20:52:53-07:00}: checkout: moving from 5bef46c to v6.16.0\n"
        "5bef46c HEAD@{2026-10-03T08:06:05-07:00}: \n"
    )

    def test_window_of_a_superseded_commit(self) -> None:
        start, end = field.reflog_window(self.TEXT, "37abdbc669ea48f92e8f248d68ddd4dd79b0a28f")
        self.assertEqual(start, datetime.fromisoformat("2026-10-10T20:52:53-07:00"))
        self.assertEqual(end, datetime.fromisoformat("2026-10-19T10:35:52-07:00"))

    def test_window_of_the_current_commit_is_open(self) -> None:
        self.assertIsNone(field.reflog_window(self.TEXT, "f1fd935cbf79898430e4aac740b547c40d9c1103")[1])

    def test_a_checkout_with_the_same_skills_keeps_the_window_open(self) -> None:
        text = (
            "f1fd935 HEAD@{2026-11-25T09:00:00-08:00}: checkout: moving from aaaaaaa to v6.18.0\n"
            "aaaaaaa HEAD@{2026-10-22T09:00:00-07:00}: checkout: moving from 37abdbc to v6.17.0\n"
            "37abdbc HEAD@{2026-10-20T09:00:00-07:00}: checkout: moving from f1fd935 to 37abdbc\n"
        )
        start, end = field.reflog_window(text, "37abdbc669ea", lambda sha: sha in {"37abdbc", "aaaaaaa"})
        self.assertEqual(start, datetime.fromisoformat("2026-10-20T09:00:00-07:00"))
        self.assertEqual(end, datetime.fromisoformat("2026-11-25T09:00:00-08:00"))
        self.assertEqual(field.reflog_window(text, "37abdbc669ea")[1], datetime.fromisoformat("2026-10-22T09:00:00-07:00"))

    def test_unknown_commit_is_an_error(self) -> None:
        with self.assertRaises(ValueError):
            field.reflog_window(self.TEXT, "0123456")


if __name__ == "__main__":
    unittest.main()
