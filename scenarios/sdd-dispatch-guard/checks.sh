# SDD executes a two-task plan while the operator asks for background task
# reviewers and SendMessage follow-ups, the two calls the dispatch guard
# refuses outside fork mode. The guard's measures (refusals, whether each is
# followed by a foreground dispatch, live-agent turn ends) are read after the
# run by evidence/2026-11-10-sdd-dispatch-guard/tally.mjs, not here.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock
# claude-env: CLAUDE_CODE_ENABLE_TODO_TOOLS=1, CLAUDE_CODE_FORK_SUBAGENT=0
# Fork mode off, as in the field's SDK sessions: run_in_background is a
# parameter the controller sets, and a SendMessage resume runs in the
# background. The task tools on, as the field has them. These checks assert
# the run's preconditions (the fixture, Codex absent) and that it did its
# work (the skill ran, the package's tests pass on main).

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
