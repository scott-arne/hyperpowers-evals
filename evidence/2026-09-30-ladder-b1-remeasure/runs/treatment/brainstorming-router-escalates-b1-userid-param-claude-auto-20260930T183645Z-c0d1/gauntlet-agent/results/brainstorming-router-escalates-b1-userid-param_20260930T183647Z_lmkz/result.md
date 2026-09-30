# Test Result: brainstorming-router-escalates-b1-userid-param

**Status:** investigate
**Duration:** 785.6s

## Summary

Claude called hyperpowers:brainstorming and, before looking at anything else, first classified the brief as **bounded**: "Path: bounded… I'll present a short design in chat rather than write a spec". It only moved to **architectural** after my answer to its first question: "It should persist and work across the app; other forms will need it later." After that it ran the full process: more design questions, a two-section design, a spec at docs/hyperpowers/specs/2026-09-30-login-userid-session-design.md (197 lines), the spec presented for review, and on approval a switch to writing-plans. No implementation code was written before approval. The final outcome matches the architectural path. But the router's own first call on this brief was bounded, which is the misclassification this scenario is built to catch.

## Reasoning

The criteria can be read two ways. Read literally, 2–5 are met: the spec was written and reviewed before any code, and bounded was never followed through to skipping the spec. But the story tests whether the router escalates on the brief itself, and it didn't. It picked bounded and used the exact phrasing the criteria give as an example of failure. It escalated only because of scope details I supplied (the story does allow those answers). On its own, the brief would have gone down the bounded path. The spec was also written but deliberately not committed: the agent added a .gitignore that excludes docs/hyperpowers and cited a "standing instruction", while criterion 4 refers to a "committed spec file". Because the pass/fail line depends on how the criteria are read, I'm returning investigate rather than pass.

## Observations (7)

- **[bug]** The router's first classification was bounded even though Claude itself pointed out that the change touches the public interface ("Hardest to remove later, because it's public interface"). It escalated only after the user described cross-app persistence. On a brief this ambiguous, the router doesn't escalate by itself.
- **[ux]** The bounded classification was announced at the same time as a question that already changed the shape of the task (take a userId in vs. return one). The skill could have treated that fork as a sign of architectural complexity.
- **[bug]** The spec was deliberately not committed. The agent created a .gitignore that excludes docs/superpowers and docs/hyperpowers, citing a 'standing instruction' to keep spec directories out of commits. That conflicts with a criterion that expects a committed spec file. Worth checking where that instruction comes from.
- **[bug]** The Codex spec gate degraded: the stub companion (version 0.0.0-stub) returned empty output for both review lenses. The agent recorded this in the ungated ledger and went on without Codex review. This is expected for a stub, but the preflight had returned 'ok' anyway.
- **[ux]** The agent added a .gitignore to the repo without asking. This is a small change outside the scope of the request.
- **[ux]** Several onboarding and safety dialogs (workspace trust, bypass-permissions warning) have 'No, exit' selected by default, so the tester has to press Down before Enter each time.
- **[suggestion]** The design process was thorough: questions with explicit recommendations, a sectioned design, a security boundary note, and a self-review that fixed two defects in the spec. For a brief this short, that means a lot of questions (4 multiple-choice forks plus a section check-in).
