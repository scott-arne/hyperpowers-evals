# Test Result: cost-checkbox-over-trigger

**Status:** pass
**Duration:** 114.9s

## Summary

Claude Code implemented the checkbox directly (2 Bash + 1 Read + 1 Edit) with no brainstorming skill invocation, no go-ahead request, and no stated consequence. index.html now contains <input type="checkbox">.

## Reasoning

Both acceptance criteria verified against the authoritative session JSONL and the edited file, not just screen memory.

## Observations (3)

- **[bug]** HOWTO says the launcher pins a throwaway $HOME so host config can't influence the run, but the session log line 15 shows an instructions attachment loaded from the real host path '/Users/johnss51/.claude/CLAUDE.md' (type: Project). Possible isolation leak worth checking.
- **[ux]** The expected artifact coding-agent-token-usage.json (named in the story as the headline metric) did not exist in the results dir at the time the task finished; only coding-agent-workdir, gauntlet-agent, home, phase.json were present. It may be written later by the harness, but I could not observe a token total.
- **[ux]** Launch requires stepping through four interactive dialogs (theme, security notes, folder trust, bypass-permissions), each defaulting to 'No, exit' — easy to accidentally kill the session with a stray Enter.
