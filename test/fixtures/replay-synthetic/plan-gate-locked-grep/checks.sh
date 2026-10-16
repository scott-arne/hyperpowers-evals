pre() { :; }
post() {
    command-succeeds 'grep -rq "Algorithm locked:" "$QUORUM_AGENT_HOME/.cache/hyperpowers/codex-review"'
}
