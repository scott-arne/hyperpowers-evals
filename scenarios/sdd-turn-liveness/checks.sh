# SDD executes a six-task plan whose two covering commands are slow soak tests
# (about four and about twelve minutes). The turn-liveness measures (premature
# stops, dispatch mode, waits, untracked launches) are read after the run by
# evidence/2026-10-19-sdd-turn-liveness/analyze.py, not here. These checks
# assert the run's preconditions (the fixture, Codex absent) and its success
# conditions (the skill ran, the checkout is still on main and holds the
# package, its unit tests and both soak tests pass there, and the soak tests
# are untouched: identical to the recorded head, and changed by no commit since
# it, so an edit that was committed and later restored still fails). The
# unit-test check repeats the main-branch test inside its own command because
# the campaign analyzer reads run success from the command-succeeds records
# (it finds the unit-test record by the substring test_unit_), not from the
# git-branch record. The history check passes --full-history so that git log
# does not hide the commits of a side branch merged back with no net change to
# the soak files. The two soak checks add about 16 minutes after the session;
# post-checks have no time limit (src/check/fs-verbs.ts spawns command-succeeds
# without one).
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
    git-branch main
    check-transcript skill-called superpowers:subagent-driven-development hyperpowers:subagent-driven-development
    check-transcript tool-called Agent
    file-exists 'ratelimit/window.py'
    file-exists 'ratelimit/registry.py'
    command-succeeds 'test "$(git branch --show-current)" = main && python3 -m unittest discover -s tests -p "test_unit_*.py"'
    command-succeeds 'python3 -m unittest tests.test_soak_short'
    command-succeeds 'python3 -m unittest tests.test_soak_long'
    command-succeeds 'r="$(cat "$(git rev-parse --absolute-git-dir)/quorum-recorded-head")" && git diff --quiet "$r" -- tests/test_soak_short.py tests/test_soak_long.py && test -z "$(git log --full-history --format=%H "$r"..HEAD -- tests/test_soak_short.py tests/test_soak_long.py)"'
}
