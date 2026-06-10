# coding-agents: claude,codex

pre() {
    git-repo
    git-branch main
    git-count worktrees eq 2
    assert-checkout-clean .
}

post() {
    tool-count Agent gte 2
    assert-checkout-clean .
    command-succeeds 'test "$(git rev-list --count --all --not main)" -ge 1'
}
