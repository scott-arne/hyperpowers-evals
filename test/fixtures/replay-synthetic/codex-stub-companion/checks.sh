pre() { :; }
post() {
    command-succeeds 'mkdir -p "$QUORUM_AGENT_CONFIG_DIR" && cp -R "$QUORUM_AGENT_HOME/seed/plugins" "$QUORUM_AGENT_CONFIG_DIR/plugins"'
    command-succeeds 'node "$QUORUM_AGENT_CONFIG_DIR/plugins/cache/openai-codex/codex/stub/scripts/codex-companion.mjs" setup --json >/dev/null'
}
