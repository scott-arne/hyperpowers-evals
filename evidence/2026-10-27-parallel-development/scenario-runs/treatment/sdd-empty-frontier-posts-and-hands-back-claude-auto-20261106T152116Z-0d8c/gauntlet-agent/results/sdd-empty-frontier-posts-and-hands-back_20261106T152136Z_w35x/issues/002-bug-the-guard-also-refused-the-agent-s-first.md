# Bug: The guard also refused the agent's first combined command (`S=...; $S/sdd-state sync ...`) because "a command whose name is computed at runtime ... cannot be shown not to be git". The agent had to rerun it as separate literal commands. This is reasonable caution, but it is extra friction for the skill's own scripted usage pattern.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The guard also refused the agent's first combined command (`S=...; $S/sdd-state sync ...`) because "a command whose name is computed at runtime ... cannot be shown not to be git". The agent had to rerun it as separate literal commands. This is reasonable caution, but it is extra friction for the skill's own scripted usage pattern.
