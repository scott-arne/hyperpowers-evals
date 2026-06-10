# coding-agents: claude,codex

pre() {
    git-repo
    git-branch main
    file-exists 'index.html'
    not file-contains 'index.html' '[Nn]otif'
}

post() {
    skill-called superpowers:brainstorming
    skill-before-implementation-tool superpowers:brainstorming Write
    skill-before-implementation-tool superpowers:brainstorming Edit
}
