# coding-agents: claude,codex,gemini,antigravity,copilot,opencode,pi
# Runs on every harness whose normalizer emits a canonical `Agent` dispatch with
# a `prompt` arg — i.e. all but kimi, whose normalizer has no subagent→Agent alias
# yet (so `tool-arg-match Agent` can't match). codex/pi carry the prompt under
# `task` natively; src/normalize/agent-prompt.ts canonicalizes it to `prompt`.

pre() {
    git-repo
    git-branch main
    requires-tool node
    file-exists 'docs/superpowers/specs/2026-06-10-slugify-design.md'
    file-exists 'docs/superpowers/plans/2026-06-10-slugify.md'
    not file-exists 'slug.js'
}

post() {
    check-transcript skill-called superpowers:subagent-driven-development
    check-transcript tool-called Agent
    # The controller must PASTE cited spec text into subagent prompts,
    # not just forward the citation. "collapse runs of hyphens" only
    # exists in the spec doc.
    check-transcript tool-arg-match Agent --matches 'prompt=collapse runs of hyphens' --ignore-case
    file-exists 'slug.js'
    file-exists 'cli.js'
    command-succeeds 'node test.js'
}
