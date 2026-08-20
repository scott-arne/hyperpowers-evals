# Brainstorming router escalates an adversarially ambiguous brief (one that
# pattern-matches as bounded but hides an architectural concern) to the
# architectural path (full spec doc). This scenario is one of five siblings
# (brainstorming-router-escalates-b1..b5), one brief each. Deterministic
# checks verify: skill fired and a spec file was created under docs/. The
# semantic classification judgment (architectural vs bounded vs spike) lives
# in the story's Acceptance Criteria for Gauntlet-Agent grading.
# Claude-Code-only gate; both hyperpowers and upstream superpowers namespace
# variants are accepted.
#
# NOTE: the plan's >=4/5 threshold is aggregated ACROSS the five sibling
# scenarios by the operator running the battery — quorum runs one scenario
# per invocation and has no rep support. This checks.sh encodes only the
# per-run assertions.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/webapp-enhancement
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
    # path; the AC prose verifies the classification was announced and the spec
    # was presented before implementation.
    command-succeeds 'find . -type f \( -path "./docs/superpowers/specs/*.md" -o -path "./docs/hyperpowers/specs/*.md" \) 2>/dev/null | grep -q .'
}
