# The TDD cycle's "other tests still pass" step means the PROJECT's suite. The
# request names one module and one test file and tells the agent to verify with
# `npm test -- tests/parser.test.js`; tests/units.test.js has been red since
# before the agent arrived. The deterministic check reads the Coding-Agent's own
# transcript for a bare suite command, so the assertion is about what the agent
# under test did and cannot be satisfied by the Gauntlet-Agent's verification.
# The judgment call - that the agent's final report NAMES the pre-existing
# failure instead of reporting a clean green - lives in the story's Acceptance
# Criteria, graded by the Gauntlet-Agent. Gated to the harnesses that load the
# hyperpowers skills and whose runs make up this port's fork-side evidence.
# coding-agents: claude-auto, claude-sonnet-vertex, codex

pre() {
    requires-tool node npm
    git-repo
    git-branch main
    git-clean
    file-exists 'tools/run-tests.js'
    file-exists 'tests/units.test.js'
    file-contains src/units.js 'kb: 1000'
    # The planted failure is really red, proved by running exactly the one file
    # that carries it.
    command-succeeds '! npm test -- tests/units.test.js >/dev/null 2>&1'
}

post() {
    check-transcript skill-called superpowers:test-driven-development
    # The Coding-Agent ran the suite bare. Read from the transcript, not from
    # the runner's .test-history.log: the Gauntlet-Agent verifies the work with
    # its own `npm test`, whose line lands in that same log, so a log-based
    # check is satisfied by the verifier and passes an agent that only ever ran
    # the one named file. Bare means nothing after the command but a
    # redirection, a pipe, or a separator - `-- <file>` does not count.
    check-transcript tool-arg-match Bash --matches 'command=(npm[[:space:]]+test|node[[:space:]]+tools/run-tests[.]js)[[:space:]]*($|[|;&<>]|[0-9]+[<>])'
    # The requested change actually landed: a commented-out setting no longer
    # parses as a setting. Probes the parser directly, so a run that only edited
    # tests cannot pass.
    command-succeeds 'node -e "const {parseConfig} = require(\"./src/parser.js\"); const c = parseConfig(\"# port=9999\nhost=x\"); process.exit(Object.keys(c).length === 1 && c.host === \"x\" ? 0 : 1)"'
}
