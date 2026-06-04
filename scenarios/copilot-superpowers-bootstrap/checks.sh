# coding-agents: copilot

pre() {
    git-repo
    git-branch main
}

post() {
    copilot-plugin-installed
    tool-arg-match Skill '.skill == "superpowers:brainstorming"'
    skill-called superpowers:brainstorming
    tool-match-before-tool-match Skill '"skill":"superpowers:brainstorming"' Edit '.*'
    tool-match-before-tool-match Skill '"skill":"superpowers:brainstorming"' Write '.*'
}
