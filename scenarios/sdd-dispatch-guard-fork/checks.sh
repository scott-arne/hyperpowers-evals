# The sdd-dispatch-guard scenario with Claude Code's fork subagent mode left
# on (the interactive default), as sdd-turn-liveness-fork does. In fork mode
# every dispatch runs in the background whatever the call passes, and a
# SendMessage resume is the skill's documented route, so the guard must log
# fork-mode and refuse nothing. evidence/2026-11-10-sdd-dispatch-guard/tally.mjs
# reads that after the run.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock
# claude-env: CLAUDE_CODE_ENABLE_TODO_TOOLS=1
# The task tools on, as the field has them; fork mode left at its default.
# These checks assert the run's preconditions (the fixture, Codex absent) and
# that it did its work (the skill ran, the package's tests pass on main).

pre() {
    git-repo
    git-branch main
    file-exists 'plan.md'
    file-exists 'design.md'
    requires-tool python3
    command-succeeds 'd="$QUORUM_AGENT_CONFIG_DIR"; f="$d/plugins/installed_plugins.json"; [ -n "$d" ] && [ -d "$d" ] && { [ ! -e "$f" ] || { [ -r "$f" ] && ! grep -q "codex@openai-codex" "$f"; }; }'
    command-succeeds 'd="$QUORUM_AGENT_CONFIG_DIR"; [ -n "$d" ] && [ -d "$d" ] && [ ! -e "$d/plugins/cache/openai-codex" ]'
}

post() {
    git-branch main
    check-transcript skill-called superpowers:subagent-driven-development hyperpowers:subagent-driven-development
    check-transcript tool-called Agent
    file-exists 'textstats/count.py'
    file-exists 'textstats/report.py'
    command-succeeds 'test "$(git branch --show-current)" = main && python3 -m unittest discover -s tests'
}
