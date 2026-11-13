# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 335.3s

## Summary

The run stopped before Task 1 was dispatched. After the first prompt, the controller loaded subagent-driven-development, chose to work on the current branch (feature/textstats), and created its ledger. Then auto-compaction ran 3 times in a row, and Claude Code stopped with "Autocompact is thrashing". No subagent was dispatched, no code was written, and no commits were made. The agent went back to an idle prompt without asking a question, so the run could not continue without the steering the story forbids.

## Reasoning

None of the four criteria were met. Claude Code stopped itself on repeated auto-compaction during SDD setup and never dispatched a task. The agent asked no questions, and the story bars any other input, so I couldn't continue the run. This is a clear failure, possibly caused by a fixture/skill problem (the window is too small for the skill's reload after compaction).

## Observations (4)

- **[bug]** With autoCompactWindow=100000 (from .claude/settings.json) and a 27.6 KB plan.md, the controller crossed the compaction threshold during setup, before Task 1 rather than after it as the scenario expected. After each compaction it reloaded the skills ("Skills restored (using-git-worktrees, subagent-driven-development)") and read SKILL.md again, 6 times in total. That refilled the context within 3 turns each time, and Claude Code gave up with an 'Autocompact is thrashing' error. Reloading the full skill text plus the plan after each compaction appears to leave too little room in this window.
- **[bug]** After the thrashing error, the agent stopped silently. It didn't ask a question or explain what was blocked, and the plan was left unstarted. A user with no context would only see a yellow warning suggesting /clear.
- **[ux]** The launch went through several startup dialogs: theme, security notes, trust folder (defaults to 'No, exit'), a 'Newer Opus model available' prompt that offers to restart even though the launcher passes --model claude-opus-5-5 (I chose No), and a bypass-permissions warning (defaults to 'No, exit'). The HOWTO says dialog-bypass state is pre-seeded, but these dialogs still appeared.
- **[suggestion]** The scenario's fixture may need a larger compaction window, or the skill a lighter recovery after compaction. As configured, compaction happens before the first task, so the 'compaction after task 1' behaviour this scenario is meant to measure never gets tested.
