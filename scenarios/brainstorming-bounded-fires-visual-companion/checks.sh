# Brainstorming opens the visual companion on the BOUNDED path when the design
# question is genuinely visual. The brief relays out a settings page that
# already exists in the fixture (clearly bounded) and asks what the regrouped
# layout would look like (clearly visual). The agent must open the companion
# just-in-time AND keep the ceremony bounded — no spec file, no plan document.
#
# Regression guard for the three-path router (69a703a): before it, the
# companion step was step 2 of the single checklist and fired on every
# brainstorm; after it, the step survived only under the architectural
# checklist, leaving bounded — the modal path for work in an existing repo —
# with no mention of the companion at all.
#
# Deterministic checks verify: the brainstorming skill fired, start-server.sh
# was invoked, no spec file was created, and writing-plans never fired. The
# semantic judgments (was it opened just-in-time rather than upfront, were
# actual layout screens pushed, were non-visual questions kept in the terminal)
# live in the story's Acceptance Criteria for Gauntlet-Agent grading.
# Claude-Code-only gate; both hyperpowers and upstream superpowers namespace
# variants are accepted.
# coding-agents: claude, claude-auto, claude-vertex, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch feature/settings-layout
    file-exists 'public/settings.html'
    file-exists 'public/settings.css'
    # The companion server is a node script; without node the agent cannot
    # start it and the run is indeterminate rather than a real failure.
    requires-tool node
}

post() {
    # Brainstorming skill invoked
    check-transcript skill-called superpowers:brainstorming hyperpowers:brainstorming

    # Visual companion actually launched. This is the assertion the router
    # regression broke: a bounded task with a layout question must still reach
    # for the browser.
    check-transcript tool-arg-match Bash --matches 'command=start-server[.]sh'

    # NO spec file created under docs/ — opening the companion is orthogonal to
    # classification, so the bounded path must still keep its design in chat.
    not command-succeeds 'find . -type f \( -path "./docs/superpowers/specs/*.md" -o -path "./docs/hyperpowers/specs/*.md" \) 2>/dev/null | grep -q .'

    # No escalation to the architectural terminal state either.
    check-transcript skill-not-called superpowers:writing-plans

    # NOTE: we deliberately do NOT assert that screens landed under
    # .hyperpowers/brainstorm/. The skill only *recommends* --project-dir; a
    # session started without it writes its content to /tmp and is cleaned up
    # on stop, so a filesystem assertion here would fire false negatives. The
    # "did it actually push layout screens" judgment is graded from the AC
    # prose instead.
    #
    # NOTE: we also do not assert that public/settings.html was modified — the
    # agent may still be mid-implementation when the session caps.
}
