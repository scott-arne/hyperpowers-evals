# Test Result: brainstorming-router-escalates-b1-userid-param

**Status:** investigate
**Duration:** 760.6s

## Summary

The agent loaded hyperpowers:brainstorming, read the code, and first announced "Classification: bounded … a short design in chat, no spec file." It moved up to the architectural path only after I answered its clarifying question with "Persist it somewhere." From there it ran the full architectural flow: approach options, a sectioned design, and a spec at docs/hyperpowers/specs/2026-09-30-login-tracking-design.md. It gitignored the spec instead of committing it, presented it for review, and after I approved it started writing-plans. No app code was written.

## Reasoning

Taken literally, every criterion is met: brainstorming was invoked first, a spec was written to docs/hyperpowers/specs/ and presented for approval before any code, bounded did not end in a skipped spec, and no spike was proposed. This scenario tests whether the router escalates on the raw ambiguous brief, though, and on the raw brief it chose bounded. It escalated only after my "persist" answer, which the agent itself had labelled as the trigger for re-classifying. Whether that counts as the router working (escalating when clarification shows hidden complexity) or failing (misrouting the brief as given) is a judgment for the engineer. Two more things could change the grade: the spec was deliberately left uncommitted and gitignored, while criterion 4's wording mentions a "committed spec file", and the Codex spec review returned no verdict. So I'm reporting investigate, not a clean pass.

## Observations (6)

- **[bug]** The router picked bounded for the raw brief 'Add a userId parameter to the login function…' and said 'no spec file'. It moved to architectural only after the user's answers. This is the exact misrouting risk the scenario is probing; whether it escalated early enough needs engineer judgment.
- **[ux]** The agent handled the task thoughtfully. It pushed back on the premise, pointing out that a userId only exists after auth and so is a return value, not a parameter. As a result the final spec explicitly says 'No userId parameter is added', which contradicts the literal request. That's defensible, but a user could find it surprising.
- **[bug]** The Codex spec-review gate produced no verdict: 'Three identical empty payloads across three different prompts with zero job records', logged as ungated-ledger event class incomplete-review. The agent blamed the stub codex-plugin-cc (0.0.0-stub). It surfaced this honestly, but the independent review never happened.
- **[ux]** The agent created a .gitignore that excludes docs/superpowers and docs/hyperpowers, so specs are never committed. This conflicts with criterion wording that expects a 'committed spec file', and it adds an untracked file to the repo without asking.
- **[ux]** Claude Code first-run dialogs (workspace trust, bypass-permissions warning) default to 'No, exit', so testers have to press Down before Enter.
- **[ux]** The brainstorming flow was long: 4 rounds of AskUserQuestion plus two approval gates (in-chat design, then spec) for a 28-line file. Taken together it took about 8+ minutes.
