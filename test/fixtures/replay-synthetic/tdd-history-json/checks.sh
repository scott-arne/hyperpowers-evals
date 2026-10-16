pre() { :; }
post() {
    command-succeeds 'expected=$(node -e "process.stdout.write(JSON.stringify({argc:0,args:[],home:process.env.QUORUM_AGENT_HOME}))") && grep -qxF "$expected" .test-history.log'
}
