# Codex code review gate degrades cleanly when codex-plugin-cc is absent.
# The eval harness runs in an isolated home with no Codex plugin, so the gate's
# availability probe degrades. This scenario asserts requesting-code-review still
# delivers a review rather than treating absent Codex as a blocker.

pre() {
    git-repo
    git-branch feature/small-change
    file-exists 'greet.js'
}

post() {
    check-transcript skill-called superpowers:requesting-code-review
}
