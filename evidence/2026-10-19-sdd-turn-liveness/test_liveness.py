"""Tests for liveness.py on synthetic records."""

from __future__ import annotations

import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import liveness
from synth import (
    AGENT_BG,
    BASH_BG,
    RELOAD_RESULT,
    assistant,
    at,
    compact_summary,
    enqueue,
    human,
    notification,
    result,
    sidechain,
    write,
)


def ts(seconds: float) -> datetime:
    return liveness.parse_ts(at(seconds))


class TurnEnds(unittest.TestCase):
    def test_human_message_after_closing_text_ends_a_turn(self) -> None:
        recs = [
            human(0, "go"),
            assistant(5, tools=[("t1", "Bash", {"command": "ls"})]),
            result(6, "t1", "ok"),
            assistant(7, "Tasks 1 and 2 are done. Moving to Task 3."),
            human(100, "continue"),
        ]
        ends = liveness.turn_ends(recs)
        self.assertEqual(len(ends), 1)
        self.assertEqual(ends[0].at, ts(7))
        self.assertEqual(ends[0].ended_by, "human")
        self.assertEqual(ends[0].next_human, "continue")
        self.assertEqual(ends[0].text, "Tasks 1 and 2 are done. Moving to Task 3.")
        self.assertIsNone(ends[0].excluded)

    def test_text_before_the_last_tool_result_is_not_the_closing_message(self) -> None:
        recs = [
            human(0, "go"),
            assistant(5, "Dispatching.", tools=[("t1", "Bash", {"command": "ls"})]),
            result(6, "t1", "ok"),
            human(50, "continue"),
        ]
        self.assertEqual(liveness.turn_ends(recs)[0].text, "")

    def test_folded_completion_is_not_a_turn_end(self) -> None:
        recs = [
            human(0, "go"),
            assistant(5, tools=[("a1", "Agent", {"description": "Implement Task 1"})]),
            result(6, "a1", AGENT_BG),
            enqueue(50, "a1"),
            assistant(51, tools=[("t2", "Bash", {"command": "ls"})]),
            result(52, "t2", "ok"),
        ]
        self.assertEqual([e.ended_by for e in liveness.turn_ends(recs)], ["eof"])

    def test_notification_delivered_as_a_message_ends_a_turn(self) -> None:
        recs = [
            human(0, "go"),
            assistant(5, tools=[("a1", "Agent", {})]),
            result(6, "a1", AGENT_BG),
            assistant(7, "Waiting for the implementer."),
            notification(90, "a1"),
        ]
        end = liveness.turn_ends(recs)[0]
        self.assertEqual(end.ended_by, "notification")
        self.assertIsNone(end.next_human)

    def test_reload_marks_the_turn_end(self) -> None:
        recs = [
            human(0, "go"),
            assistant(5, tools=[("a1", "Agent", {})]),
            result(400, "a1", RELOAD_RESULT, is_error=True),
            assistant(401, "No response requested."),
            human(402, "Resume"),
        ]
        self.assertEqual(liveness.turn_ends(recs)[0].excluded, "reload")

    def test_api_error_and_interrupt_are_excluded(self) -> None:
        error = [human(0, "go"), assistant(5, "API Error: Connection error."), human(60, "Resume")]
        self.assertEqual(liveness.turn_ends(error)[0].excluded, "error")
        interrupt = [
            human(0, "go"),
            assistant(5, "Working on it."),
            human(6, "[Request interrupted by user]"),
            human(7, "Resume"),
        ]
        self.assertEqual(liveness.turn_ends(interrupt)[0].excluded, "interrupt")

    def test_session_killed_mid_tool_call_is_excluded_at_eof(self) -> None:
        recs = [human(0, "go"), assistant(5, tools=[("t1", "Bash", {"command": "sleep 9"})])]
        self.assertEqual(liveness.turn_ends(recs)[0].excluded, "killed")

    def test_local_command_records_are_not_human_messages(self) -> None:
        stdout = human(6.5, "<local-command-stdout>ok</local-command-stdout>")
        del stdout["origin"]
        recs = [
            human(0, "go"),
            assistant(5, "Done for now."),
            human(6, "<local-command-caveat>Caveat: ...</local-command-caveat>", isMeta=True),
            stdout,
            human(7, "Resume"),
        ]
        ends = liveness.turn_ends(recs)
        self.assertEqual(len(ends), 1)
        self.assertEqual(ends[0].next_human, "Resume")

    def test_typed_slash_command_is_a_human_message(self) -> None:
        recs = [
            human(0, "go"),
            assistant(5, "Done for now."),
            human(6, "<command-message>hyperpowers:brainstorming</command-message>"),
        ]
        ends = liveness.turn_ends(recs)
        self.assertEqual(len(ends), 1)
        self.assertEqual(ends[0].ended_by, "human")
        self.assertTrue((ends[0].next_human or "").startswith("<command-message>"))

    def test_stop_right_after_a_launch_is_judged_live(self) -> None:
        for closer in (notification(90, "a1"), human(90, "continue")):
            recs = [
                human(0, "go"),
                assistant(5, tools=[("a1", "Agent", {"description": "Implement Task 1"})]),
                result(6, "a1", AGENT_BG),
                closer,
            ]
            end = liveness.turn_ends(recs)[0]
            self.assertEqual(end.at, ts(6))
            state = liveness.state_at(end.at, liveness.tasks(recs + [enqueue(120, "a1")]), [])
            self.assertEqual(state, "live")

    def test_dismissed_question_is_a_question_and_an_answered_one_is_not(self) -> None:
        ask = ("q1", "AskUserQuestion", {"questions": [{"question": "Which option should govern?", "options": []}]})
        dismissed = [
            human(0, "go"),
            assistant(5, tools=[ask]),
            result(6, "q1", "The user declined to answer the questions.", is_error=True),
            human(50, "use option A"),
        ]
        end = liveness.turn_ends(dismissed)[0]
        self.assertIn("Which option should govern?", end.text)
        self.assertTrue(liveness.asks_or_blocks(end.text))
        answered = [
            human(0, "go"),
            assistant(5, tools=[ask]),
            result(6, "q1", 'Your questions have been answered: "Which option should govern?"="A".'),
            assistant(7, "Tasks 1 and 2 are done. Moving to Task 3."),
            human(50, "continue"),
        ]
        end = liveness.turn_ends(answered)[0]
        self.assertEqual(end.text, "Tasks 1 and 2 are done. Moving to Task 3.")
        self.assertFalse(liveness.asks_or_blocks(end.text))

    def test_compaction_summary_is_not_a_turn_end(self) -> None:
        recs = [
            human(0, "go"),
            assistant(5, tools=[("t1", "Bash", {"command": "ls"})]),
            result(6, "t1", "ok"),
            compact_summary(7),
            assistant(8, "Tasks 1 and 2 are done. Moving to Task 3."),
            human(100, "continue"),
        ]
        ends = liveness.turn_ends(recs)
        self.assertEqual(len(ends), 1)
        self.assertEqual((ends[0].at, ends[0].ended_by, ends[0].next_human), (ts(8), "human", "continue"))
        self.assertIsNone(liveness.idle_marker(compact_summary(9)))


class Load(unittest.TestCase):
    def test_sidechain_and_timestampless_records_are_dropped(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = write(
                Path(tmp) / "s.jsonl",
                [human(0, "go"), sidechain(assistant(1, "sub")), {"type": "file-history-snapshot"}],
            )
            records = liveness.load(path)
        self.assertEqual([r["type"] for r in records], ["user"])

    def test_slim_load_keeps_markers_and_drops_bulk(self) -> None:
        bulk = AGENT_BG + " " + "x" * 5000
        with tempfile.TemporaryDirectory() as tmp:
            path = write(Path(tmp) / "s.jsonl", [result(1, "a1", bulk)])
            rec = liveness.load(path, slim=True)[0]
        text = liveness.result_text(liveness.blocks(rec)[0])
        self.assertIn(liveness.LAUNCH_AGENT, text)
        self.assertLessEqual(len(text), 300)


class Tasks(unittest.TestCase):
    def test_background_agent_launch_and_queued_completion(self) -> None:
        recs = [assistant(5, tools=[("a1", "Agent", {})]), result(6, "a1", AGENT_BG), enqueue(90, "a1")]
        task = liveness.tasks(recs)["a1"]
        self.assertEqual((task.kind, task.launched, task.completed), ("agent", ts(6), ts(90)))

    def test_foreground_call_is_not_a_task(self) -> None:
        recs = [assistant(5, tools=[("a1", "Agent", {})]), result(300, "a1", "DONE: implemented")]
        self.assertEqual(liveness.tasks(recs), {})

    def test_completion_from_a_delivered_notification(self) -> None:
        recs = [
            assistant(5, tools=[("b1", "Bash", {"command": "sleep 60", "run_in_background": True})]),
            result(6, "b1", BASH_BG),
            notification(70, "b1"),
        ]
        task = liveness.tasks(recs)["b1"]
        self.assertEqual((task.kind, task.completed), ("bash", ts(70)))

    def test_markers_count_only_at_the_start_of_their_own_tools_result(self) -> None:
        recs = [
            assistant(1, tools=[("g1", "Bash", {"command": "grep -r 'Async agent' ."})]),
            result(2, "g1", "notes.md: Async agent launched successfully. agentId: x"),
            assistant(3, tools=[("g2", "Bash", {"command": "grep -h '^Async' log"})]),
            result(4, "g2", AGENT_BG),
            assistant(5, tools=[("r1", "Read", {"file_path": "/x/log"})]),
            result(6, "r1", "1\t" + BASH_BG),
            assistant(7, tools=[("g3", "Bash", {"command": "cat run.log"})]),
            result(8, "g3", "the session ended before this call's result was recorded"),
            assistant(9, tools=[("g4", "Bash", {"command": "head -1 run.log"})]),
            result(10, "g4", BASH_BG),
            assistant(11, tools=[("g5", "Bash", {"command": "head -1 reload.log"})]),
            result(12, "g5", RELOAD_RESULT),
        ]
        self.assertEqual(liveness.tasks(recs), {})
        self.assertEqual(liveness.reloads(recs), [])
        genuine = [
            assistant(1, tools=[("a1", "Agent", {})]),
            result(2, "a1", AGENT_BG),
            assistant(3, tools=[("b1", "Bash", {"command": "sleep 900", "run_in_background": True})]),
            result(4, "b1", BASH_BG),
            assistant(5, tools=[("z1", "Bash", {"command": "ls"})]),
            result(6, "z1", RELOAD_RESULT, is_error=True),
        ]
        self.assertEqual(sorted(liveness.tasks(genuine)), ["a1", "b1"])
        self.assertEqual(liveness.reloads(genuine), [ts(6)])

    def test_auto_backgrounded_command_is_a_tracked_launch(self) -> None:
        moved = (
            "Command did not complete within its 120s timeout and was moved to the background (ID: b-auto). "
            "Output is being written to: /tmp/b-auto.output. You will be notified when it completes."
        )
        recs = [
            assistant(5, tools=[("b9", "Bash", {"command": "python3 -m unittest tests.test_soak_short -v"})]),
            result(125, "b9", moved),
            enqueue(245, "b9"),
        ]
        task = liveness.tasks(recs)["b9"]
        self.assertEqual((task.kind, task.launched, task.completed), ("bash", ts(125), ts(245)))
        printed = [
            assistant(5, tools=[("g9", "Bash", {"command": "grep moved notes.md"})]),
            result(6, "g9", "notes.md: " + moved),
        ]
        self.assertEqual(liveness.tasks(printed), {})

    def test_an_agent_resumed_with_send_message_is_a_tracked_launch(self) -> None:
        resumed = '{"success":true,"message":"Resuming agent a101f9c","resumedAgentId":"a101f9c7fb53d3bd5"}'
        stopped = (
            '{"success":true,"message":"Agent \\"a5b6c7d8\\" was stopped (completed); resumed it in the background '
            'with your message. You will be notified when it finishes.","resumedAgentId":"a5b6c7d8"}'
        )
        recs = [
            assistant(5, tools=[("m1", "SendMessage", {"to": "a101f9c7fb53d3bd5", "message": "Fix the finding."})]),
            result(6, "m1", resumed),
            enqueue(200, "m1"),
            assistant(210, tools=[("m2", "SendMessage", {"to": "a5b6c7d8", "message": "Fix the next one."})]),
            result(211, "m2", stopped),
            enqueue(300, "m2"),
            assistant(310, tools=[("m3", "SendMessage", {"to": "worker", "message": "Status?"})]),
            result(311, "m3", '{"success":true,"message":"Message queued for worker"}'),
        ]
        task_map = liveness.tasks(recs)
        self.assertEqual(sorted(task_map), ["m1", "m2"])
        self.assertEqual((task_map["m1"].kind, task_map["m1"].launched, task_map["m1"].completed), ("agent", ts(6), ts(200)))
        self.assertEqual((task_map["m2"].kind, task_map["m2"].launched, task_map["m2"].completed), ("agent", ts(211), ts(300)))
        self.assertEqual(liveness.state_at(ts(100), task_map, []), "live")

    def test_states_live_none_censored_and_killed_by_reload(self) -> None:
        recs = [
            assistant(5, tools=[("a1", "Agent", {})]),
            result(6, "a1", AGENT_BG),
            enqueue(90, "a1"),
            assistant(99, tools=[("b1", "Bash", {"command": "sleep 900", "run_in_background": True})]),
            result(100, "b1", BASH_BG),
            result(200, "z9", RELOAD_RESULT, is_error=True),
        ]
        task_map = liveness.tasks(recs)
        reload_times = liveness.reloads(recs)
        self.assertEqual(liveness.state_at(ts(50), task_map, reload_times), "live")
        self.assertEqual(liveness.state_at(ts(95), task_map, reload_times), "none")
        self.assertEqual(liveness.state_at(ts(150), task_map, reload_times), "censored")
        self.assertEqual(liveness.state_at(ts(250), task_map, reload_times), "none")

    def test_censored_work_wins_over_live_work(self) -> None:
        # One task runs to a recorded completion while another never records one.
        recs = [
            assistant(5, tools=[("a1", "Agent", {})]),
            result(6, "a1", AGENT_BG),
            assistant(7, tools=[("b1", "Bash", {"command": "sleep 900", "run_in_background": True})]),
            result(8, "b1", BASH_BG),
            enqueue(90, "a1"),
        ]
        task_map = liveness.tasks(recs)
        self.assertEqual(liveness.state_at(ts(7), task_map, []), "live")
        self.assertEqual(liveness.state_at(ts(50), task_map, []), "censored")
        self.assertEqual(liveness.state_at(ts(100), task_map, []), "censored")


class Heuristic(unittest.TestCase):
    CASES = (
        ("Does Section 4 look right?", True),
        ("Say the word and I continue.", True),
        ("Say 'proceed' when you want it started.", True),
        ("I'll wait for your go-ahead (or change requests) before invoking writing-plans.", True),
        ("Let me know if you want changes, otherwise I'll move to the implementation plan.", True),
        ("Shall I start the next design?", True),
        ("Task 9 is BLOCKED: the fixture needs credentials.", True),
        ("Which do you want: merge locally or open a PR?", True),
        ("Once you approve, I'll write the implementation plan.", True),
        ("The integration decision is yours.", True),
        ("Tests green. **Ready to merge?**", True),
        ("Tasks 1 and 2 are done. Moving to Task 3.", False),
        ("Next: Task 14's gate, then the final whole-branch review.", False),
        ("Gate round 3 running, the last in its budget.", False),
        ("Dispatching the Task 1 implementer.", False),
        ("Task 7 next: the predicate set, the largest remaining port.", False),
        ("One more Codex round to confirm the fix, then the branch is ready to merge.", False),
        ("Waiting on the Python suite re-run before dispatching its reviewer.", False),
        ("Spec approved, quality Approved. Moving on.", False),
        ("", False),
    )

    def test_labelled_sample(self) -> None:
        for text, expected in self.CASES:
            with self.subTest(text=text):
                self.assertEqual(liveness.asks_or_blocks(text), expected)

    def test_resume_words(self) -> None:
        for text in ("Resume", "resume.", " Proceed ", "continue", "Keep going!"):
            self.assertTrue(liveness.is_resume(text))
        for other in (None, "Resume the review after lunch", "go"):
            self.assertFalse(liveness.is_resume(other))


if __name__ == "__main__":
    unittest.main()
