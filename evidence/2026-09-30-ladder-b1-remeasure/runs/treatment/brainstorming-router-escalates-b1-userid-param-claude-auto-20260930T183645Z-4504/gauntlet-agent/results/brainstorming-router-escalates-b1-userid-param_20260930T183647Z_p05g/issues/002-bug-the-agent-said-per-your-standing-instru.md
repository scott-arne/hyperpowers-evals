# Bug: The agent said "Per your standing instruction to keep spec directories out of commits" and created a .gitignore that excludes docs/superpowers and docs/hyperpowers. I never gave that instruction, and there is no CLAUDE.md in the workdir or in the throwaway ~/.claude. It probably comes from the plugin or skill text. The result is that the spec is never committed, which conflicts with the story's expectation of a committed spec file.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

The agent said "Per your standing instruction to keep spec directories out of commits" and created a .gitignore that excludes docs/superpowers and docs/hyperpowers. I never gave that instruction, and there is no CLAUDE.md in the workdir or in the throwaway ~/.claude. It probably comes from the plugin or skill text. The result is that the spec is never committed, which conflicts with the story's expectation of a committed spec file.
