# Bug: The Codex spec review came back empty on both passes, even after a retry, because the seeded Codex is a stub (version 0.0.0-stub). The agent handled this well: it told me plainly that no outside review had happened and logged the missed review as pending. It also ran many long shell commands against the review-gate scripts, which slowed things down.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The Codex spec review came back empty on both passes, even after a retry, because the seeded Codex is a stub (version 0.0.0-stub). The agent handled this well: it told me plainly that no outside review had happened and logged the missed review as pending. It also ran many long shell commands against the review-gate scripts, which slowed things down.
