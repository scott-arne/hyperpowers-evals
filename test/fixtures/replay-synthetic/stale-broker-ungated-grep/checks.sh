pre() { :; }
post() {
    command-succeeds 'grep -rq "\"class\":\"degraded-gate\".*\"status\":\"stale-broker\"" "$QUORUM_AGENT_HOME/.cache/hyperpowers/ungated" 2>/dev/null'
}
