# Bug: The Codex spec-review gate did not actually run: agent reported "Codex spec gate — did not complete ... the resolved companion is a stub (codexVersion: 0.0.0-stub). Both round-1 lenses ... wrote a two-byte {} ... verdict-normalize --require-coverage returned incomplete". The story says a stub Codex was intentionally seeded, but the gate produced an unrecovered incomplete and the spec got only self-review. Worth confirming that's the intended stub behavior.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b2-config-module
**Scenario Status:** pass

## Description

The Codex spec-review gate did not actually run: agent reported "Codex spec gate — did not complete ... the resolved companion is a stub (codexVersion: 0.0.0-stub). Both round-1 lenses ... wrote a two-byte {} ... verdict-normalize --require-coverage returned incomplete". The story says a stub Codex was intentionally seeded, but the gate produced an unrecovered incomplete and the spec got only self-review. Worth confirming that's the intended stub behavior.
