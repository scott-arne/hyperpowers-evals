pre() { :; }
post() {
    command-succeeds 'mkdir -p "$QUORUM_AGENT_CONFIG_DIR" && cp -R "$QUORUM_AGENT_HOME/seed/plugins" "$QUORUM_AGENT_CONFIG_DIR/plugins"'
    command-succeeds 'test -d "$QUORUM_AGENT_CONFIG_DIR/plugins/data/codex-openai-codex/state"'
}
