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
from liveness import parse_ts
from synth import (
    AGENT_BG,
    BASH_BG,
    RELOAD_RESULT,
    assistant,
    at,
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

    def test_records_after_the_window_change_nothing(self) -> None:
        cutoff = datetime(2026, 10, 20, 10, 5, tzinfo=UTC)
        late_sdd = [
            human(0, "Plan first.", entrypoint="sdk-ts"),
            assistant(5, "Planning."),
            human(400, "Now execute it."),
            assistant(410, tools=[SDD]),
            result(411, "s1", "Launching skill"),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp)
            write(projects / "p1" / "zed.jsonl", session()[:10])
            seen_at_cutoff = field.collect(projects, SINCE, cutoff)
            # The same session grows: a resume at 500 answers the stop at 110, and work goes on.
            write(projects / "p1" / "zed.jsonl", session())
            grown = field.collect(projects, SINCE, cutoff)
            # A session that invokes SDD only after the cutoff does not join the window.
            write(projects / "p2" / "late.jsonl", late_sdd)
            joined = field.collect(projects, SINCE, cutoff)
        self.assertEqual((seen_at_cutoff["sessions"], seen_at_cutoff["premature"]), (1, 1))
        self.assertEqual(grown, seen_at_cutoff)
        self.assertEqual(joined, seen_at_cutoff)

    def test_a_session_qualifies_only_by_an_in_window_sdd_invocation(self) -> None:
        # synth's base is ten hours into the window, so ten hours and a minute earlier is before SINCE.
        before = -36_060
        early_sdd = [
            human(before, "Execute the plan.", entrypoint="sdk-ts"),
            assistant(before + 5, tools=[SDD]),
            result(before + 6, "s1", "Launching skill"),
            assistant(10, tools=[("k1", "TaskCreate", {"subject": "A"})]),
            result(11, "k1", "Task #1 created successfully: A"),
            assistant(20, "Working on Task 1."),
            human(30, "Resume"),
        ]
        # The same work, with the skill loaded again inside the window.
        reloaded = [
            *early_sdd[:3],
            assistant(5, tools=[("s2", "Skill", {"skill": "hyperpowers:subagent-driven-development"})]),
            result(6, "s2", "Launching skill"),
            *early_sdd[3:],
        ]
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp)
            write(projects / "p1" / "zed.jsonl", early_sdd)
            out = field.collect(projects, SINCE, UNTIL)
            write(projects / "p1" / "zed.jsonl", reloaded)
            again = field.collect(projects, SINCE, UNTIL)
        self.assertEqual((out["sessions"], out["premature"], out["boundaries"]), (0, 0, 0))
        self.assertEqual((again["sessions"], again["premature"], again["boundaries"]), (1, 1, 0))

    def test_a_session_is_measured_from_its_first_in_window_sdd_invocation(self) -> None:
        # Planning-phase task events before the skill is invoked are not SDD execution.
        early_work = [
            human(0, "Let's plan this.", entrypoint="sdk-ts"),
            assistant(10, tools=[("k0", "TaskCreate", {"subject": "plan"})]),
            result(11, "k0", "Task #1 created successfully: plan"),
            assistant(20, "Thinking about the design."),
            human(30, "Resume"),
            assistant(40, tools=[("k1", "TaskUpdate", {"taskId": "1", "status": "completed"})]),
            result(41, "k1", "Task #1 updated"),
            assistant(100, tools=[SDD]),
            result(101, "s1", "Launching skill"),
            assistant(110, tools=[("k2", "TaskCreate", {"subject": "A"})]),
            result(111, "k2", "Task #2 created successfully: A"),
            assistant(120, "Working on Task 2."),
            human(130, "Resume"),
            assistant(140, tools=[("k3", "TaskUpdate", {"taskId": "2", "status": "completed"})]),
            result(141, "k3", "Task #2 updated"),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp)
            write(projects / "p1" / "zed.jsonl", early_work)
            out = field.collect(projects, SINCE, UNTIL)
        self.assertEqual(out["sessions"], 1)
        # one boundary (Task 2) and one premature stop (at 120), none from before the invocation
        self.assertEqual((out["boundaries"], out["premature"]), (1, 1))

    def test_todo_items_are_not_task_list_items(self) -> None:
        todos = [
            human(0, "Execute the plan.", entrypoint="sdk-ts"),
            assistant(5, tools=[SDD]),
            result(6, "s1", "Launching skill"),
            assistant(10, tools=[("t1", "TodoWrite", {"todos": [{"content": "A", "status": "in_progress"}]})]),
            result(11, "t1", "Todos have been modified successfully"),
            assistant(20, "Working through the list."),
            human(30, "Resume"),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp)
            write(projects / "p1" / "zed.jsonl", todos)
            out = field.collect(projects, SINCE, UNTIL)
        self.assertEqual((out["premature"], out["boundaries"]), (0, 0))
        # The session still counts: it invoked the skill in the window and carries records there.
        self.assertEqual(out["sessions"], 1)


class Helpers(unittest.TestCase):
    def test_cohort_yields_qualifying_sessions_with_their_first_invocation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp)
            write(projects / "p1" / "zed.jsonl", session())
            write(projects / "p1" / "cli.jsonl", [human(0, "hi", entrypoint="cli"), assistant(5, tools=[SDD]), result(6, "s1", "x")])
            write(projects / "p2" / "nosdd.jsonl", [human(0, "hi", entrypoint="sdk-ts"), assistant(5, "ok.")])
            rows = list(field.cohort(projects, SINCE, UNTIL))
        self.assertEqual([p.name for p, _, _ in rows], ["zed.jsonl"])
        self.assertEqual(rows[0][2], parse_ts(at(5)))

    def test_premature_ends_are_the_open_task_stops_that_neither_ask_nor_wait(self) -> None:
        ends = field.premature_ends(session(), SINCE, UNTIL)
        self.assertEqual([e.at for e in ends], [parse_ts(at(110))])
        self.assertEqual(field.premature_ends(session(), parse_ts(at(115)), UNTIL), [])


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
