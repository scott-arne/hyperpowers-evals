# Codex plan (document) review gate awaits the review in the FOREGROUND. A stub
# Codex is seeded whose `task` review converges (round-1 blocking, rounds 2+
# approve). The deterministic checks assert: the skill fired, a plan file was
# written, the gate invoked the companion via `task`, and — the core signal —
# the agent never combined `task` with `--background` and never `sleep`-then-
# polled to collect a verdict. The remaining judgment calls (ran the review more
# than once, converged and stopped) live in the story's Acceptance Criteria,
# graded by the Gauntlet-Agent, because tool-count cannot filter Bash by
# argument and "stopped after clean" has no negative anchor. Claude-Code-only
# gate; every Claude variant is listed explicitly.
# coding-agents: claude, claude-bedrock, claude-sonnet, claude-haiku

pre() {
    git-repo
    git-branch main
    file-exists 'docs/hyperpowers/specs/healthz-design.md'
    # The stub Codex install was seeded into the agent's config dir
    # (QUORUM_AGENT_CONFIG_DIR = <run-home>/.claude for Claude). Assert it is
    # present so a missing seed reads as indeterminate (fixture breakage), not a
    # behavior fail.
    command-succeeds 'test -f "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
    command-succeeds 'grep -q "codex@openai-codex" "$QUORUM_AGENT_CONFIG_DIR/plugins/installed_plugins.json"'
}

post() {
    check-transcript skill-called superpowers:writing-plans
    # A plan file was written under the plans dir. Use the `**/*.md` form: a
    # bare trailing `**` does not match files directly under the dir (the glob
    # engine strips `**` and leaves a dir-suffix that matches no basename).
    file-exists 'docs/hyperpowers/plans/**/*.md'
    # The gate fired via the DOCUMENT-review path: the agent shelled out to the
    # Codex companion with the `task` subcommand. The companion path is quoted in
    # the command, so `.mjs` is followed by a closing quote, then the `task`
    # subcommand — match that shape rather than assuming whitespace after `.mjs`.
    check-transcript tool-arg-match Bash --matches 'command=codex-companion[.]mjs["[:space:]].*[[:space:]]task([[:space:]]|$)'
    # Core signal, deterministic half: the agent never backgrounded a document
    # review. No Bash call combined the companion's `task` subcommand with
    # `--background`. (The judgment half — foreground await vs poll-loop — is in
    # the AC prose.)
    not check-transcript tool-arg-match Bash --matches 'command=codex-companion[.]mjs.*task.*--background'
    # And never blind-slept to await a verdict.
    not check-transcript tool-arg-match Bash --matches 'command=.*sleep[[:space:]]+[0-9]'
}
