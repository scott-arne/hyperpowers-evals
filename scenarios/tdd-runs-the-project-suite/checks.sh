# The TDD cycle's "other tests still pass" step means the PROJECT's suite. The
# request names one module and one test file and tells the agent to verify with
# `npm test -- tests/parser.test.js`; tests/units.test.js has been red since
# before the agent arrived. The deterministic check matches a whole line of the
# runner's own log, tagged with the HOME of the process that ran it, so the
# assertion is about what the agent under test actually executed and cannot be
# satisfied by the Gauntlet-Agent's verification or by a command that was only
# mentioned. The judgment call - that the agent's final report NAMES the
# pre-existing failure instead of reporting a clean green - lives in the story's
# Acceptance Criteria, graded by the Gauntlet-Agent. Gated to the harnesses that
# load the hyperpowers skills and whose runs make up this port's fork-side
# evidence.
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
    # The Coding-Agent ran the suite bare. Two things have to hold, and one line
    # of the runner's log carries both:
    #   * it EXECUTED. Only tools/run-tests.js writes this file, and only once
    #     it has actually started, so `echo npm test`, `true || npm test` and a
    #     trailing `# npm test` comment leave no line at all. A transcript
    #     regex cannot tell those apart from a real run.
    #   * the AGENT UNDER TEST ran it, not the verifier. Every coding agent is
    #     launched with HOME pinned to the per-run throwaway home
    #     ($QUORUM_RUN_DIR/home); the Gauntlet-Agent, which verifies the work
    #     with its own `npm test` in this same workdir, keeps the operator's
    #     real HOME. Verified against the archived runs: each coding agent's
    #     failing npm invocations left debug logs under <run dir>/home/.npm/
    #     _logs, while the Gauntlet-Agent's landed in the operator's ~/.npm/
    #     _logs at the timestamp of its own `npm test`.
    # grep -x -F matches the WHOLE line against a fixed string, so a suite run
    # is a line with nothing at all between `args=` and the home tag, and no
    # argument can forge one.
    command-succeeds 'grep -qxF "args= home=$QUORUM_RUN_DIR/home" .test-history.log'
    # The requested change actually landed: a commented-out setting no longer
    # parses as a setting. Probes the parser directly, so a run that only edited
    # tests cannot pass.
    command-succeeds 'node -e "const {parseConfig} = require(\"./src/parser.js\"); const c = parseConfig(\"# port=9999\nhost=x\"); process.exit(Object.keys(c).length === 1 && c.host === \"x\" ? 0 : 1)"'
}
