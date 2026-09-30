# Bug: The Codex spec gate ran against the seeded stub (codex-plugin-cc 0.0.0-stub). Both lenses returned empty payloads, verdict-normalize reported 'incomplete', and the agent logged an ungated event, saying the spec was 'Claude-reviewed only'. This looks like the stub behaving as designed, and the agent handled it transparently.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

The Codex spec gate ran against the seeded stub (codex-plugin-cc 0.0.0-stub). Both lenses returned empty payloads, verdict-normalize reported 'incomplete', and the agent logged an ungated event, saying the spec was 'Claude-reviewed only'. This looks like the stub behaving as designed, and the agent handled it transparently.
