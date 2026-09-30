# Bug: Problem on my side: the adapter's `type` tool fails on any text starting with '-' ("command send-keys: invalid flag -"). On my first try the bullet lines were never typed, and my separate Enter presses sent a cut-off prompt (the intro paragraph only, no requirements). I interrupted with Escape before the assistant replied: the log had no assistant turn and nothing changed on disk. I then ran /clear and sent the full message in a new session (76896710-...). The aborted session 41e6eb5e-... is still on disk and should be ignored when grading.

**Kind:** bug
**Scenario:** triggering-writing-plans
**Scenario Status:** pass

## Description

Problem on my side: the adapter's `type` tool fails on any text starting with '-' ("command send-keys: invalid flag -"). On my first try the bullet lines were never typed, and my separate Enter presses sent a cut-off prompt (the intro paragraph only, no requirements). I interrupted with Escape before the assistant replied: the log had no assistant turn and nothing changed on disk. I then ran /clear and sent the full message in a new session (76896710-...). The aborted session 41e6eb5e-... is still on disk and should be ignored when grading.
