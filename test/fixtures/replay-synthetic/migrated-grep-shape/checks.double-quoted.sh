pre() { :; }
post() {
    command-succeeds "grep -rq 'FIXTURE-IDEA-7Q4' \"$QUORUM_AGENT_HOME/.cache/hyperpowers/codex-review\""
}
