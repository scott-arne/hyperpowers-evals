claude-code: 2.1.317 (Claude Code)
C1 agent-payload: PASS run_in_background one=false three=true four=true; tool_use_id in transcript: true,true,true
C2 sendmessage-payload: PASS to="a256bf440f8abc822" probe-one agentId="a256bf440f8abc822"
C3 agent-id: PASS subagent Bash agent_id="a256bf440f8abc822"; controller dispatches without agent_id: true
C4 deny-honored: PASS probe three result: "PreToolUse:Agent hook error: PROBE-DENY probe three"; SendMessage result: "PROBE-DENY sendmessage"
C5 result-shapes: PASS probe one {"status":"completed"}; probe four {"status":"async_launched","isAsync":true}
C6 fork-shape (informational): probe one {"status":"async_launched","isAsync":true}; probe four {"status":"async_launched","isAsync":true}
