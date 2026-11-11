# finishing-a-development-branch finishes a branch with no plan and no spec
# whose full suite runs about 11.7 minutes, longer than one foreground tool
# call, and whose local merge is not a fast-forward (main gained
# slugkit/limits.py after the branch was cut). The turn-liveness measure
# (turn ends while a suite run was still going) is read after the run by
# evidence/2026-11-07-finish-long-suite-merge/analyze.py, not here. These
# checks assert the run's preconditions (the fixture, with main not an
# ancestor of the branch) and its success conditions: the skill ran, the
# branch is merged into main with main's own commit kept, the fast tests
# (both files) pass there, and the test files are untouched since the
# recorded head (a committed edit later restored still fails, through the
# --full-history log). The slow
# corpus replay is not repeated here: the analyzer reads from the transcript
# whether the session ran it.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock
# claude-env: CLAUDE_CODE_ENABLE_TODO_TOOLS=1
# The task tools on, as on this host's field sessions; the launcher drops the
# operator's own Claude variables.

pre() {
    git-repo
    git-branch feature/strip-accents
    command-succeeds '! git merge-base --is-ancestor main HEAD'
    file-exists 'tests/test_corpus.py'
    file-exists 'tests/corpus.tsv'
    requires-tool python3
}

post() {
    check-transcript skill-called superpowers:finishing-a-development-branch hyperpowers:finishing-a-development-branch
    command-succeeds 'git merge-base --is-ancestor "$(cat "$(git rev-parse --absolute-git-dir)/quorum-recorded-head")" main'
    command-succeeds 'git show main:slugkit/__init__.py | grep -q unicodedata'
    command-succeeds 'git cat-file -e main:slugkit/limits.py'
    command-succeeds 'd=$(mktemp -d) && git archive main | tar -x -C "$d" && cd "$d" && python3 -m unittest tests.test_slugify tests.test_limits'
    command-succeeds 'r="$(cat "$(git rev-parse --absolute-git-dir)/quorum-recorded-head")" && git diff --quiet "$r" main -- tests/test_corpus.py tests/corpus.tsv tests/test_slugify.py && test -z "$(git log --full-history --no-merges --format=%H "$r"..main -- tests/test_corpus.py tests/corpus.tsv tests/test_slugify.py)"'
}
