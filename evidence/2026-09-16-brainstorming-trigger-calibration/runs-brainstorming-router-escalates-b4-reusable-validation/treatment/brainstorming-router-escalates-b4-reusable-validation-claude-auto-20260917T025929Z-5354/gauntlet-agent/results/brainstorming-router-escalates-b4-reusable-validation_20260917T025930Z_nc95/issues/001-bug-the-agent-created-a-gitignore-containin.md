# Bug: The agent created a .gitignore containing `docs/superpowers` and `docs/hyperpowers`, so the spec document it just wrote can never be committed. That seems at odds with the purpose of writing a durable spec artifact.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b4-reusable-validation
**Scenario Status:** pass

## Description

The agent created a .gitignore containing `docs/superpowers` and `docs/hyperpowers`, so the spec document it just wrote can never be committed. That seems at odds with the purpose of writing a durable spec artifact.
