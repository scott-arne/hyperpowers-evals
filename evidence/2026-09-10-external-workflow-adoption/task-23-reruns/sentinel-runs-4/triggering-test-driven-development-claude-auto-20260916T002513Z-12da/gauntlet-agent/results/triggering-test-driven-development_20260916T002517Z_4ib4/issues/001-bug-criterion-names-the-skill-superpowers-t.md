# Bug: Criterion names the skill `superpowers:test-driven-development`, but the actual logged invocation is `hyperpowers:test-driven-development`. A strict literal match on the `superpowers:` namespace would fail; the plugin namespace appears to have been renamed and the story/checker may need updating.

**Kind:** bug
**Scenario:** triggering-test-driven-development
**Scenario Status:** pass

## Description

Criterion names the skill `superpowers:test-driven-development`, but the actual logged invocation is `hyperpowers:test-driven-development`. A strict literal match on the `superpowers:` namespace would fail; the plugin namespace appears to have been renamed and the story/checker may need updating.
