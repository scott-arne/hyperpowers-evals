# Codex spec review gate degrades cleanly when codex-plugin-cc is absent.
# The eval harness runs in an isolated home with no Codex plugin, so the gate's
# availability probe degrades. This scenario asserts brainstorming still produces
# a spec and reaches handback rather than treating absent Codex as a blocker.

pre() {
    git-repo
    git-branch main
}

post() {
    check-transcript skill-called superpowers:brainstorming
    # A spec file was written under the specs dir despite Codex being absent.
    file-exists 'docs/superpowers/specs/**'
}
