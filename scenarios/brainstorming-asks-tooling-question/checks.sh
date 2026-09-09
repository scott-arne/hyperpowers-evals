# A new project's design presentation covers architecture, components, data
# flow, error handling and testing, and never asks which tooling to stand up.
# Linting, formatting and test infrastructure are cheapest to add before any
# code exists and most expensive to retrofit, so the moment to decide passes
# silently. The fixture is an empty repository - no linter config, no test
# runner, no package.json, no pyproject.toml - and the story's driver answers
# the tooling question with ruff and pytest if it is asked, and never raises
# tooling itself.
#
# The deterministic checks read the artifact, not the conversation: a spec was
# written on the architectural path, and its Global Constraints section names
# one of the tools the user chose. A spec that records the selection only in
# chat, or in some other section, does not satisfy it. The judgment calls - that
# the question was asked alongside the architecture rather than after the fact,
# and that the answer landed in the spec rather than only in chat - live in the
# story's Acceptance Criteria, graded by the Gauntlet-Agent, which never sees
# this file. Claude-Code-only: the architectural path here fires the Codex
# approach and spec gates. Narrowed further to the one actor whose runs are this
# upstream port's fork-side evidence.
# coding-agents: claude-auto

pre() {
    git-repo
    git-branch main
    git-clean
    # The premise: an empty directory. `git-clean` rules out untracked files and
    # this rules out tracked ones, so together they prove there is no linter
    # config, no test runner, no package.json and no pyproject.toml for the
    # agent to read a tooling decision off of.
    command-succeeds 'test -z "$(git ls-files)"'
    command-succeeds 'test -f "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'grep -q "codex@openai-codex" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
}

post() {
    # Brainstorming ran. `skill-called` compares the segment after the last
    # colon, so this matches the hyperpowers namespace too.
    check-transcript skill-called superpowers:brainstorming

    # The architectural path produced a spec. Separated from the oracle below so
    # a run that never reached the spec is distinguishable from one that wrote a
    # spec without the tooling selection.
    command-succeeds 'for f in docs/hyperpowers/specs/*-design.md docs/superpowers/specs/*-design.md; do test -f "$f" && exit 0; done; exit 1'

    # The user's tooling selection reached the spec's Global Constraints. awk
    # opens the section at a markdown heading whose text is "global
    # constraints" (any level, case-insensitive, tolerating bold markers and
    # trailing words) and closes it at the next heading, so a mention of pytest
    # under Testing cannot satisfy this. Inside that section, one of the two
    # tools the story's driver names has to appear as a whole word. Hand-checked
    # against a spec with no Global Constraints section but pytest under
    # Testing, a Global Constraints section naming no tooling, and no spec at
    # all: all three fail.
    command-succeeds 'for f in docs/hyperpowers/specs/*-design.md docs/superpowers/specs/*-design.md; do test -f "$f" || continue; awk "tolower(\$0) ~ /^#+[ \t]*\**global constraints/ {s=1; next} s && /^#/ {s=0} s {print}" "$f" | grep -qiwE "ruff|pytest" && exit 0; done; exit 1'
}
