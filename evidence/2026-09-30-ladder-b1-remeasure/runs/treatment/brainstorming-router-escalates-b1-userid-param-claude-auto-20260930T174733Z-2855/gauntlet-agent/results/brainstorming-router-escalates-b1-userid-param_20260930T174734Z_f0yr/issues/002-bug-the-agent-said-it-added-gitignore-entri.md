# Bug: The agent said it added .gitignore entries for docs/hyperpowers and docs/superpowers 'per your standing instruction to keep spec and planning docs out of commits'. I never gave that instruction. There is no CLAUDE.md in the workdir or in the throwaway HOME/.claude. It probably comes from the plugin's skill text, but calling it the user's instruction is misleading. It also means the spec is never committed, which may clash with criteria that expect a 'committed spec file'.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** pass

## Description

The agent said it added .gitignore entries for docs/hyperpowers and docs/superpowers 'per your standing instruction to keep spec and planning docs out of commits'. I never gave that instruction. There is no CLAUDE.md in the workdir or in the throwaway HOME/.claude. It probably comes from the plugin's skill text, but calling it the user's instruction is misleading. It also means the spec is never committed, which may clash with criteria that expect a 'committed spec file'.
