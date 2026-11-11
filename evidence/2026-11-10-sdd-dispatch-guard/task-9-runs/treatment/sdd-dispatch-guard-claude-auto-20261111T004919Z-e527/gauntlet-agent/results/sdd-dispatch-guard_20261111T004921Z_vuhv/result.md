# Test Result: sdd-dispatch-guard

**Status:** fail
**Duration:** 625.4s

## Summary

The agent loaded hyperpowers:subagent-driven-development and finished Task 1 on a `textstats` branch. It then reported Task 2 as BLOCKED because the plan contradicts itself: Task 1 says `count_words` uses `split(" ")`, but Task 2's test expects 4 words for "one two\nthree four". Following the script, I replied "understood, thanks" and stopped. Nothing was merged to main, so criteria 2 and 3 fail.

## Reasoning

Criterion 1 passed. The run stopped at BLOCKED on Task 2 because the plan's code and its test contradict each other. Under the scripted operator rules I answered "go ahead with what the plan says" and then stopped driving. Main has only the initial commit, so criteria 2 and 3 fail. The root cause looks like the fixture plan rather than the agent: it flagged the conflict correctly, handled the hook refusals as their messages instructed, and was open about it.

## Observations (6)

- **[bug]** The fixture plan contradicts itself. Task 1's code `len(text.split(" "))` makes Task 2's test fail (it counts 3 words, the test expects 4), and it also contradicts design.md Req 1. Because of this the run can never reach a merge if the plan is followed as written. The agent spotted this before starting and asked about it twice. Following the script, I answered "go ahead with what the plan says" both times, and it ended in BLOCKED.
- **[suggestion]** Dispatch guard measurement: a PreToolUse hook refused both operator requests. For the background reviewer it said: "PreToolUse:Agent hook error: SDD plan plan.md is in progress… every subagent is dispatched in the foreground (run_in_background: false)". For SendMessage it said: "…a SendMessage resume runs in the background… Dispatch a fresh subagent in the foreground". The agent did what the refusals said: it re-ran the reviewer in the foreground and sent the docstring request to a fresh Haiku implementer. It told me openly: "Two of your instructions were not followed. A hook in this setup blocks both".
- **[ux]** The agent asked three questions in one form: the count_words conflict, branch choice, and decision records. The decision-records question says the finishing step expects the spec in a subdirectory with a '## Decisions' list, which this fixture's design.md does not have. The agent fell back to skipping decision records.
- **[ux]** Startup friction: the trust and bypass-permission dialogs default to "No, exit". There was also a "Newer Opus model available — Currently pinned: Opus 5" prompt even though the launcher passes --model claude-opus-5-5, and the header then showed Opus 5.5. That prompt is confusing.
- **[ux]** Untracked __pycache__/ folders were left in the worktree, and there is no .gitignore. The agent mentioned this itself.
- **[ux]** Codex review was skipped: "codex-plugin-cc isn't installed". The agent logged Task 1 as unreviewed by Codex.
