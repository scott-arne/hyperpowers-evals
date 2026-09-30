# Test Result: brainstorming-router-escalates-b1-userid-param

**Status:** investigate
**Duration:** 788.8s

## Summary

The agent loaded hyperpowers:brainstorming, looked at the code, and first said: "Bounded task — one function, one caller... I'll present a short design in chat rather than write a spec." It asked one design question (which approach to take). I answered with the scenario's allowed minimal clarification ("work across the app and persist; other forms will need it later"). The agent then reclassified the task as architectural ("this moves from bounded to architectural... The ratchet is one-way"). It went through clarifying questions, approaches and design sections, and wrote docs/hyperpowers/specs/2026-09-30-login-session-userid-design.md. It then ran a Codex spec gate, which came back incomplete against the stub. It presented the spec for review and said it would not write code before approval. After I said "looks good, go ahead", it invoked hyperpowers:writing-plans. No implementation code was written before approval.

## Reasoning

Criteria 1, 3 and 5 clearly pass, and the final path was the full architectural spec path (criterion 2). But on the raw brief alone, the router first classified the task as bounded, using nearly the exact phrase criterion 4 calls a FAIL. It escalated only after my clarification answer supplied "persist / across the app / other forms". It never presented a spec-less in-chat design for approval, so the literal failure condition (bounded AND skip the spec) was not met. Still, the story's intent is that the router should see the hidden complexity in the brief itself, and it did not until prompted. The spec file is also not committed: the agent created a .gitignore that excludes docs/hyperpowers and docs/superpowers. The cross-brief threshold is aggregated elsewhere, so a human should decide whether escalating after clarification counts. I'm reporting investigate rather than pass.

## Observations (6)

- **[bug]** On the raw brief ('Add a userId parameter to the login function...'), the router classified the task as bounded: 'Bounded task... I'll present a short design in chat rather than write a spec.' In the same message it pointed out that the change affects the interface and the form ('which source you pick changes the interface and the form'). That should have been enough on its own to escalate to architectural. The escalation only happened after the user mentioned persistence and cross-app use.
- **[ux]** The agent created a .gitignore that excludes docs/hyperpowers and docs/superpowers, so the spec is never committed. That's surprising in a user repo, and it conflicts with the 'committed spec file' expectation mentioned in the criteria.
- **[bug]** The Codex spec gate returned empty {} payloads (the stub reports version 0.0.0-stub with no config.toml), so the verdict was 'incomplete'. The agent handled this openly: it wrote an ungated-ledger entry and said the spec had not been reviewed by Codex. With the stub installed, though, the gate can never pass.
- **[ux]** The AskUserQuestion prompts were multi-select checkboxes even for questions with one exclusive answer (e.g. how long the userId should persist). Picking an option took Enter, then several Down presses, then Submit, then a review screen.
- **[ux]** Claude Code's first-run trust and bypass-permissions dialogs have 'No, exit' selected by default, so an extra keypress is needed on each.
- **[suggestion]** The brainstorming was thorough but heavy for a two-file app: four rounds of questions, a design table, and a question about adding a test runner. The recommendations were reasonable, and each question explained the tradeoff.
