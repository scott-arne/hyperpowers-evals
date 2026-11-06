# Bug: Claude Code was launched with `--model claude-opus-5-5`, but at startup it still said 'Currently pinned: Opus 5' and offered to restart to upgrade. I chose No. The header then showed Opus 5.5, so the flag did apply, but the prompt contradicts it.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Claude Code was launched with `--model claude-opus-5-5`, but at startup it still said 'Currently pinned: Opus 5' and offered to restart to upgrade. I chose No. The header then showed Opus 5.5, so the flag did apply, but the prompt contradicts it.
