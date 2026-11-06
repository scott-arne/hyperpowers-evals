# A second session must take the claimable task (2) while Task 1 is held by
# the fixture session; it must neither stop on the held task nor take it over.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    file-exists 'docs/hyperpowers/plans/parallel.md'
    command-succeeds 'find ../home/.cache -name progress.md -exec head -n 1 {} \; | grep -q "^# SDD ledger — plan: docs/hyperpowers/plans/parallel.md$"'
    command-succeeds 'find ../home/.cache -type d -path "*/claims/task-1" | grep -q .'
}

post() {
    check-transcript skill-called superpowers:subagent-driven-development hyperpowers:subagent-driven-development
    check-transcript tool-arg-match Bash --matches 'command=sdd-state register'
    check-transcript tool-arg-match Bash --matches 'command=sdd-state next'
    check-transcript tool-arg-match Bash --matches 'command=sdd-state claim [^\n]* 2 --session'
    not check-transcript tool-arg-match Bash --matches 'command=sdd-state claim [^\n]* 1 --session [^\n]*--takeover'
    command-succeeds 'find ../home/.cache -type f -name progress.md -exec grep -l "^Task 2: branch" {} \; | grep -q .'
}
