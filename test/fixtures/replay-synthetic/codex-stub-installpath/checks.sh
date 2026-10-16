pre() { :; }
post() {
    command-succeeds 'mkdir -p "$QUORUM_AGENT_CONFIG_DIR" && cp -R "$QUORUM_AGENT_HOME/seed/plugins" "$QUORUM_AGENT_CONFIG_DIR/plugins"'
    command-succeeds 'STUB=$(node -e "const d=JSON.parse(require(\"fs\").readFileSync(process.argv[1],\"utf8\")); console.log(d.plugins[\"codex@openai-codex\"][0].installPath)" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"); node "$STUB/scripts/codex-companion.mjs" setup --json >/dev/null'
}
