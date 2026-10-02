# Ux: The agent ran the plan's code and tests in a temporary copy of the repo while planning (`mktemp -d; cp -R .`). My working tree stayed clean, but a user who said "don't start implementing" might not expect code to be run at all. The final message does say this happened and that the tree is unchanged.

**Kind:** ux
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

The agent ran the plan's code and tests in a temporary copy of the repo while planning (`mktemp -d; cp -R .`). My working tree stayed clean, but a user who said "don't start implementing" might not expect code to be run at all. The final message does say this happened and that the tree is unchanged.
