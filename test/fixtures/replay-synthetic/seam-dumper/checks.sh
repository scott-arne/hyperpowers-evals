pre() { :; }
post() {
    command-succeeds 'env | sort > "$QUORUM_AGENT_HOME/dump.txt"'
}
