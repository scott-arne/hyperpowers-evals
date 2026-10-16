pre() { :; }
post() {
    command-succeeds 'mkdir -p "$QUORUM_AGENT_CONFIG_DIR" && cp -R "$QUORUM_AGENT_HOME/seed/plugins" "$QUORUM_AGENT_CONFIG_DIR/plugins"'
    command-succeeds 'find "$QUORUM_AGENT_CONFIG_DIR/plugins/data/codex-openai-codex/state" -type f -name "broker.json" | grep -q .'
}
