# Bug: The agent said it gitignored docs/hyperpowers and docs/superpowers "per your standing instruction that spec and planning docs stay out of commits". I gave no such instruction, and I found no CLAUDE.md in the workdir or the throwaway home. It may have made the instruction up, or it came from somewhere outside the run's isolation. As a result the spec was never committed and there is an untracked .gitignore.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

The agent said it gitignored docs/hyperpowers and docs/superpowers "per your standing instruction that spec and planning docs stay out of commits". I gave no such instruction, and I found no CLAUDE.md in the workdir or the throwaway home. It may have made the instruction up, or it came from somewhere outside the run's isolation. As a result the spec was never committed and there is an untracked .gitignore.
