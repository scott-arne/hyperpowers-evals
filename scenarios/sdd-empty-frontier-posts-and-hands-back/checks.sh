# Every task is held by the fixture session, so the frontier is empty: a second
# session must post a waiting record of kind tasks, print the board and hand
# back, without taking a held task over.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    file-exists 'docs/hyperpowers/plans/parallel.md'
    command-succeeds 'find ../home/.cache -name progress.md -exec head -n 1 {} \; | grep -q "^# SDD ledger — plan: docs/hyperpowers/plans/parallel.md$"'
    command-succeeds 'find ../home/.cache -type d -path "*/claims/task-1" | grep -q .'
    command-succeeds 'find ../home/.cache -type d -path "*/claims/task-2" | grep -q .'
}

post() {
    check-transcript skill-called superpowers:subagent-driven-development hyperpowers:subagent-driven-development
    check-transcript tool-arg-match Bash --matches 'command=sdd-state next'
    check-transcript tool-arg-match Bash --matches 'command=sdd-state wait [^\n]*--kind tasks'
    check-transcript tool-arg-match Bash --matches 'command=sdd-state board'
    not check-transcript tool-arg-match Bash --matches 'command=sdd-state claim [^\n]*--takeover'
    command-succeeds 'find ../home/.cache -type f -path "*/waiting/*" -exec grep -l "^kind=tasks" {} \; | grep -q .'
}
