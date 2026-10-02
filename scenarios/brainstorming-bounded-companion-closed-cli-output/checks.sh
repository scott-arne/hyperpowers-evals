# Brainstorming keeps the visual companion CLOSED on the BOUNDED path when the
# change adds something to a command-line tool's terminal output and puts
# nothing on a page. The over-trigger counterpart of
# brainstorming-bounded-companion-after-compaction: there a feature adds
# controls to a web page and the companion should open; here the candidate
# outputs are text, and the companion guide puts text and tabular content in
# the terminal. See setup.sh for the fixture.
#
# Deterministic checks verify: the brainstorming skill fired, start-server.sh
# was never invoked, no spec file was created, and writing-plans never fired.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/status-health
    file-exists 'bin/svc.js'
    file-exists 'src/status.js'
    file-exists 'src/load.js'
    file-exists 'data/services.json'
    file-exists 'test/status.test.js'
    file-exists 'README.md'
    # The fixture is a node CLI, and the companion server is a node script; a
    # host without node cannot exercise either, so the run is indeterminate.
    requires-tool node
}

post() {
    check-transcript skill-called superpowers:brainstorming hyperpowers:brainstorming

    not check-transcript tool-arg-match Bash --matches 'command=start-server[.]sh'

    not command-succeeds 'find . -type f \( -path "./docs/superpowers/specs/*.md" -o -path "./docs/hyperpowers/specs/*.md" \) 2>/dev/null | grep -q .'

    check-transcript skill-not-called superpowers:writing-plans
}
