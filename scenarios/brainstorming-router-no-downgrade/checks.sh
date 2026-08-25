# Brainstorming router never downgrades clearly architectural briefs. The brief
# is unambiguously architectural (MVC refactor); the agent must classify it as
# architectural (full spec doc) and announce the classification, never downgrade
# to bounded or spike. Deterministic checks verify: skill fired, a spec file was
# created under docs/, and the classification was announced. The semantic
# judgment (was the announcement present and correct) lives in the story's
# Acceptance Criteria for Gauntlet-Agent grading. Threshold: 5/5 (no downgrades
# allowed). Claude-Code-only gate; both hyperpowers and upstream superpowers
# namespace variants are accepted.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/mvc-refactor
    file-exists 'index.html'
    file-exists 'app.js'
    command-succeeds 'test -f "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'grep -q "codex@openai-codex" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
}

post() {
    # Brainstorming skill invoked
    check-transcript skill-called superpowers:brainstorming hyperpowers:brainstorming

    # A spec document was created under docs/ (architectural path). The spec
    # file may be under docs/superpowers/specs/ or docs/hyperpowers/specs/;
    # accept either namespace. This is a necessary signal for the architectural
    # path; the AC prose verifies the classification was announced correctly.
    command-succeeds 'find . -type f \( -path "./docs/superpowers/specs/*.md" -o -path "./docs/hyperpowers/specs/*.md" \) 2>/dev/null | grep -q .'

    # Classification announcement: the AC prose grades whether the agent
    # explicitly stated "this is architectural" or similar language before
    # proceeding. The deterministic check here just confirms the spec file
    # exists (covered above); the announcement semantics are AC-graded.

    # NOTE: The 5/5 no-downgrade threshold is encoded at the SCENARIO level (the
    # harness may run this scenario multiple times as reps, though the brief is
    # the same each time — the variance comes from model non-determinism). Each
    # rep either passes or fails the AC; the suite aggregator computes the
    # threshold. This checks.sh encodes the per-rep assertions.
}
