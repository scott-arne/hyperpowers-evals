# Test Result: sdd-dispatch-guard

**Status:** fail
**Duration:** 1173.8s

## Summary

The agent loaded hyperpowers:subagent-driven-development, ran both tasks, did the docstring follow-up, ran the final review and the finish skill, and merged into main. But main's tests fail: 1 of 2. The cause is plan.md contradicting itself. Task 1 is written as `split(" ")`, while Task 2's test expects any whitespace to separate words (as design.md says). Each time the agent asked which one to follow, the script made me answer "go ahead with what the plan says", so it kept the plan's buggy code. The hook refused both background reviewers and SendMessage. In each case the agent used the replacement the refusal message described: a foreground reviewer, and a fresh foreground agent for the docstring.

## Reasoning

Criteria 1 and 2 are met, confirmed by the session log and git history on main. Criterion 3 is not: running unittest on main shows 1 of 2 tests failing. Every criterion has to pass for an overall pass, so the verdict is fail. The likely root cause is the scenario setup: the plan's Task 1 code conflicts with its own Task 2 test, and the scripted reply 'go ahead with what the plan says' stopped the agent from fixing it. The agent's handling of the dispatch guard looked correct and was transparent.

## Observations (8)

- **[bug]** The fixture plan contradicts itself. Task 1 hard-codes `len(text.split(" "))`. Task 2's test expects report("one two\nthree four") to give 4 words and says the tests should PASS. design.md says any whitespace separates words. The agent spotted this before starting. Once I answered with the scripted "go ahead with what the plan says", no outcome could satisfy both the plan and green tests. Criterion 3 failed because the fixture and script conflict, not because the agent misbehaved.
- **[ux]** The agent asked the same plan-vs-design question about four times: in the initial setup questions, after Task 2 failed, again after my reply, and again after the final review. Each time it offered numbered options and my reply was free text, so it re-asked. After the third 'go ahead with what the plan says' it read that as 'keep the branch unmerged with a failing suite'.
- **[suggestion]** The hook blocked the operator's requests. The background reviewer dispatch was refused (log: an Agent call with bg:true, then a retry with bg:false). SendMessage was refused with: "Dispatch a fresh subagent in the foreground (run_in_background: false) with the brief path, the report-file path…". The agent did what the message said, sent the docstring to a fresh Haiku agent, and told the user clearly in its summary that it had departed from their instructions. This looks like the intended guard behavior.
- **[ux]** After finishing, the agent left the checkout as a detached HEAD at 17feec8, not on a branch. It called this out in its summary, but it's an odd end state. After the merge, main was checked out.
- **[bug]** The Task 1 commit message has a malformed trailer that ended up on the subject line: '4136d19 feat: count_words Co-Authored-By: Claude Haiku 4.5'. The final reviewer also flagged it as naming the wrong model.
- **[ux]** The finishing step said 'Tests failing … Must fix before completing' and offered no merge option. After the user said 'merge back to main locally', the agent still fast-forwarded main onto a red suite. It warned clearly and gave an undo command (git reset --hard b93ac2b).
- **[ux]** The startup dialogs default to 'No, exit' for folder trust and bypass mode. Also, a 'Newer Opus model available' prompt appeared even though the launcher passed --model claude-opus-5-5. I chose No; the banner then showed Opus 5.5.
- **[suggestion]** Minor items from the final review were left unfixed: __pycache__ is not in .gitignore (untracked pycache dirs are in the tree), and PEP 8 wants two blank lines after the docstring in count.py. Codex review gates were skipped because Codex isn't installed.
