# SDD executes a six-task plan whose two covering commands are slow soak tests
# (about four and about twelve minutes). The turn-liveness measures (premature
# stops, dispatch mode, waits, untracked launches) are read after the run by
# evidence/2026-10-19-sdd-turn-liveness/analyze.py, not here. These checks
# assert the run's preconditions (the fixture, Codex absent) and its success
# conditions (the skill ran, the package is on the main checkout, its unit
# tests and both soak tests pass there, the soak tests are untouched). The two
# soak checks add about 16 minutes after the session; post-checks have no time
# limit (src/check/fs-verbs.ts spawns command-succeeds without one).
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock

pre() {
    git-repo
    git-branch main
    file-exists 'plan.md'
    file-exists 'design.md'
    file-exists 'tests/test_soak_short.py'
    file-exists 'tests/test_soak_long.py'
    requires-tool python3
    command-succeeds 'd="$QUORUM_AGENT_CONFIG_DIR"; f="$d/plugins/installed_plugins.json"; [ -n "$d" ] && [ -d "$d" ] && { [ ! -e "$f" ] || { [ -r "$f" ] && ! grep -q "codex@openai-codex" "$f"; }; }'
    command-succeeds 'd="$QUORUM_AGENT_CONFIG_DIR"; [ -n "$d" ] && [ -d "$d" ] && [ ! -e "$d/plugins/cache/openai-codex" ]'
}

post() {
    check-transcript skill-called superpowers:subagent-driven-development hyperpowers:subagent-driven-development
    check-transcript tool-called Agent
    file-exists 'ratelimit/window.py'
    file-exists 'ratelimit/registry.py'
    command-succeeds 'python3 -m unittest discover -s tests -p "test_unit_*.py"'
    command-succeeds 'python3 -m unittest tests.test_soak_short'
    command-succeeds 'python3 -m unittest tests.test_soak_long'
    command-succeeds 'git diff --quiet "$(cat "$(git rev-parse --absolute-git-dir)/quorum-recorded-head")" -- tests/test_soak_short.py tests/test_soak_long.py'
}
